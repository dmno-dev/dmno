import _ from 'lodash-es';
import graphlib from '@dagrejs/graphlib';
import Debug from 'debug';

import { ConfigraphNode } from './config-node';
import { SchemaError } from './errors';
import { ConfigraphEntity, ConfigraphEntityDef } from './entity';
import { ConfigraphPlugin } from './plugin';
import { DependencyNotResolvedResolutionError } from './resolvers';
import { ConfigraphCachingProvider } from './caching';

import { CacheMode, ConfigraphDataTypesRegistry, ConfigValue } from '.';


const debug = Debug('configraph');

// config item keys are all checked against this regex
// currently it must start with a letter (to make it a valid js property)
// and can only contain letters, number, and underscore
// we may want to restrict "__" if we use that as the nesting separator for env var overrides?
const VALID_NODE_KEY_REGEX = /^[a-z]\w*$/i;


// TODO: ideally we would extract the shape of the entity metadata from these schema objects
// but currently we are passing it in twice, once for TS and once for runtime
export type MetadataSchemaObject = Record<string, {
  required?: boolean,
  serialize?: boolean
}>;

export class Configraph<
  EntityMetadata extends Record<string, any> = {},
  NodeMetadata extends Record<string, any> = {},
> {
  static autoIdEntityCounter = 1;

  _rootEntityId!: string;
  entitiesById: Record<string, ConfigraphEntity> = {};
  entitiesByParentId: Record<string, Array<ConfigraphEntity>> = {};
  sortedEntityIds: Array<string> = [];

  pluginsById: Record<string, ConfigraphPlugin> = {};
  nodesByFullPath: Record<string, ConfigraphNode> = {};

  readonly defaultDataTypeRegistry: ConfigraphDataTypesRegistry;

  constructor(opts?: {
    defaultTypeRegistry?: ConfigraphDataTypesRegistry,
  }) {
    this.defaultDataTypeRegistry = opts?.defaultTypeRegistry || new ConfigraphDataTypesRegistry();
  }

  get rootEntity() {
    if (!this._rootEntityId) throw new Error('ConfiGraph root entity id is not set');
    return this.entitiesById[this._rootEntityId];
  }

  get sortedEntities() {
    return _.map(this.sortedEntityIds, (id) => this.entitiesById[id]);
  }

  generateEntityId() {
    if (!this._rootEntityId) return 'configraph_root';
    return `configraph_entity_${Configraph.autoIdEntityCounter++}`;
  }

  createEntity(
    entityDef: ConfigraphEntityDef<EntityMetadata, NodeMetadata>,
  ) {
    return new ConfigraphEntity(
      this,
      entityDef,
    );
  }

  registerEntity(entity: ConfigraphEntity) {
    if (this.entitiesById[entity.id]) {
      // TODO: this should likely roll up into a graph level error, rather than exploding
      throw new Error(`Entity IDs must be unique - duplicate id detected "${entity.id}"`);
    }
    // first entity registered will always be considered the root
    if (!this._rootEntityId) this._rootEntityId = entity.id;
    else if (!entity.parentId) entity.parentId = this._rootEntityId;
    this.entitiesById[entity.id] = entity;
    if (entity.parentId) {
      this.entitiesByParentId[entity.parentId] ||= [];
      this.entitiesByParentId[entity.parentId].push(entity);
    }
    // do we also want to add to an array?
  }

  // these dags probably should be private, but for now we are reaching up into them to manipulate them
  entitiesDag = new graphlib.Graph({ directed: true });
  // we could experiment with "compound nodes" and have everything within 1 graph
  nodesDag = new graphlib.Graph({ directed: true });
  private initEntitiesDag() {
    const entitiesArray = _.values(this.entitiesById);

    for (const entityId in this.entitiesById) {
      this.entitiesDag.setNode(entityId, { /* can add more metadata here */ });
    }

    // first set up graph edges based on entity "parentId"
    for (const entity of entitiesArray) {
      // check if parent service is valid
      if (entity.parentId) {
        if (!this.entitiesById[entity.parentId]) {
          entity.schemaErrors.push(new SchemaError(`Unable to find parent entity "${entity.parentId}"`));
        } else if (entity.parentId === entity.id) {
          // we've already added a schema error and fixed this above
          throw new Error('Entity cannot have parent set to self');
        } else {
          // creates a directed edge from parent to child
          this.entitiesDag.setEdge(entity.parentId, entity.id, { type: 'parent' });
        }

      // anything without an explicit parent set is a child of the root
      } else if (!entity.isRoot) {
        // we've already defaulted the parent to the root if not specified during registration
        // so we can throw if something doesn't look right
        if (!entity.parentId) throw new Error('Expected non-root entity to have a parent id set');
      }
    }

    // add graph edges based on "pick"
    // we will not process individual items yet, but this will give us a DAG of entity dependencies
    for (const entity of entitiesArray) {
      if (entity.isRoot) continue;
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      _.each(entity.pickSchema, (rawPick) => {
        // pick defaults to picking from "root" unless otherwise specified
        const pickFromEntityId = _.isString(rawPick)
          ? this._rootEntityId
          : (rawPick.entityId || this._rootEntityId);
        if (!this.entitiesById[pickFromEntityId]) {
          entity.schemaErrors.push(new SchemaError(`Invalid entity id in "pick" config - "${pickFromEntityId}"`));
        } else if (pickFromEntityId === entity.id) {
          entity.schemaErrors.push(new SchemaError('Cannot "pick" from self'));
        } else {
          // create directed edge from entity output feeding into this one
          // (ex: database feeds DB_URL into api )
          this.entitiesDag.setEdge(pickFromEntityId, entity.id, { type: 'pick' });
        }
      });
    }

    // look for cycles in the entities graph, add schema errors if present
    const graphCycles = graphlib.alg.findCycles(this.entitiesDag);
    _.each(graphCycles, (cycleMemberIds) => {
      // each cycle is just an array of gaphlib node "names" (our entity "ids") in the cycle
      _.each(cycleMemberIds, (id) => {
        this.entitiesById[id].schemaErrors.push(new SchemaError(`Detected entity dependency cycle - ${cycleMemberIds.join(' + ')}`));
        // we'll set these back to root to avoid infinite loops
        this.entitiesById[id].parentId = this._rootEntityId;
      });
    });

    // if no cycles were found in the entities graph, we use a topological sort to get the right order to continue processing config
    if (!graphCycles.length) {
      this.sortedEntityIds = graphlib.alg.topsort(this.entitiesDag);
      // we'll sort the services array into dependency order
      debug('DEP SORTED ENTITIES', this.sortedEntityIds);
    }
  }

  // TODO: probably could use a better name
  private _configProcessed = false;
  processConfig() {
    this._configProcessed = true;

    // TODO: reset some things here, if we are re-processing

    this.initEntitiesDag();

    const postProcessFns: Array<() => void> = [];
    for (const entity of this.sortedEntities) {
      const ancestorIds = entity.ancestorIds;

      // process "picked" nodes
      if (entity.isRoot) {
        if (entity.pickSchema.length) {
          entity.schemaErrors.push(new SchemaError('Root entity cannot pick anything'));
        }
      } else {
        for (const rawPickItem of entity.pickSchema || []) {
          const pickFromEntityId = _.isString(rawPickItem)
            ? this._rootEntityId
            : (rawPickItem.entityId || this._rootEntityId);
          const isPickingFromAncestor = ancestorIds.includes(pickFromEntityId);
          const rawPickKey = _.isString(rawPickItem) ? rawPickItem : rawPickItem.key;
          const pickFromService = this.entitiesById[pickFromEntityId];
          if (!pickFromService) {
          // NOTE: we've already added a schema error if item is picking from an non-existant service
          // while setting up the services DAG, so we can just bail on the item
            continue;
          }

          // first we'll gather a list of the possible keys we can pick from
          // when picking from an ancestor, we pick from all config items
          // while non-ancestors expose only items that have `expose: true` set on them

          const allKeysToPickFrom = _.keys(pickFromService.configNodes);
          const allowedKeysToPickFrom: Array<string> = [];

          if (isPickingFromAncestor) {
            // note we're picking from the processed config items
            // which may include items that entity picked
            allowedKeysToPickFrom.push(...allKeysToPickFrom);
          } else {
            // whereas only "exposed" items can be picked from non-ancestors
            const exposedNodes = _.pickBy(pickFromService.configNodes, (node) => !!node.type.expose);
            allowedKeysToPickFrom.push(..._.keys(exposedNodes));
          }

          const keysToPick: Array<string> = [];

          // if passed key is `true` it means pick everything
          if (rawPickKey === true) {
            keysToPick.push(...allowedKeysToPickFrom);

          // if key is a string or array of strings, we'll need to check they are valid
          } else if (_.isString(rawPickKey) || _.isArray(rawPickKey)) {
            for (const keyToCheck of _.castArray(rawPickKey)) {
              if (!allowedKeysToPickFrom.includes(keyToCheck)) {
                if (allKeysToPickFrom.includes(keyToCheck)) {
                  entity.schemaErrors.push(new SchemaError(`Picked node ${pickFromEntityId} > ${keyToCheck} is not exposed - add \`expose: true\` to node schema`));
                } else {
                  entity.schemaErrors.push(new SchemaError(`Picked node ${pickFromEntityId} > ${keyToCheck} does not exist`));
                }
              } else {
                keysToPick.push(keyToCheck);
              }
            }

          // if it's a function, we'll be filtering from the list of potential items
          } else if (_.isFunction(rawPickKey)) { // fn that filters keys
            const pickKeysViaFilter = _.filter(allowedKeysToPickFrom, rawPickKey);

            // we probably want to warn the user if the filter selected nothing?
            if (!pickKeysViaFilter.length) {
              // TODO: we may want to mark this error as a "warning" or something?
              // or some other way of configuring / ignoring
              entity.schemaErrors.push(new SchemaError(`Pick from ${pickFromEntityId} using key filter fn had no matches`));
            } else {
              keysToPick.push(...pickKeysViaFilter);
              // console.log('pick keys by filter', pickKeysViaFilter);
            }
          }

          for (let i = 0; i < keysToPick.length; i++) {
            const pickKey = keysToPick[i];
            // deal with key renaming
            let newKeyName = pickKey;
            if (!_.isString(rawPickItem) && rawPickItem.renameKey) {
              // renameKey can be a static string (if dealing with a single key)
              if (_.isString(rawPickItem.renameKey)) {
                // deal with the case of trying to rename multiple keys to a single value
                // TODO: might be able to discourage this in the TS typing?
                if (keysToPick.length > 1) {
                  // add an error (once)
                  if (i === 0) {
                    entity.schemaErrors.push(new SchemaError(`Picked multiple keys from ${pickFromEntityId} using static rename`));
                  }
                  // add an index suffix... so the items will at least still appear
                  newKeyName = `${rawPickItem.renameKey}-${i}`;
                } else {
                  newKeyName = rawPickItem.renameKey;
                }

              // or a function to transform the existing key
              } else {
                newKeyName = rawPickItem.renameKey(pickKey);
              }
            }

            entity.addConfigNode(newKeyName, {
              sourceNode: pickFromService.configNodes[pickKey],
              transformValue: _.isString(rawPickItem) ? undefined : rawPickItem.transformValue,
            });
          }
        }
      }

      // process the regular configSchema nodes
      for (const nodeKey in entity.configSchema) {
        if (!nodeKey.match(VALID_NODE_KEY_REGEX)) {
          entity.schemaErrors.push(new SchemaError(`Invalid node key "${nodeKey}"`));
        } else {
          const nodeDef = entity.configSchema[nodeKey];
          // this descends into children
          entity.addConfigNode(nodeKey, nodeDef);
        }
      }

      // now that all config nodes exist, process the resolvers
      for (const node of entity.flatConfigNodes) {
        this.nodesDag.setNode(node.getFullPath());

        this.nodesByFullPath[node.getFullPath()] = node;
        // calls process on each item's resolver, and collects "post-processing" functions to call if necessary
        const nodePostProcessFns = node.valueResolver?.process(node);
        postProcessFns.push(...nodePostProcessFns || []);
        // TODO: handle errors - attach as schema errors to resolver / node?
      }

      entity.initOverrides();
    }

    // after the entire graph of config nodes have been processed, we'll call post-processing functions
    // this is needed for `collect()` where we need child entities and their nodes to be initialized
    postProcessFns.forEach((postProcessFn) => {
      postProcessFn();
    });

    // add declared dependencies to the node graph
    for (const [nodePath, node] of Object.entries(this.nodesByFullPath)) {
      for (const [dependsOnPath, dependencyType] of Object.entries(node.dependsOnPathsObj)) {
        // TODO: we could add inject and collect as types to make it clearer?
        this.nodesDag.setEdge(dependsOnPath, nodePath, { type: dependencyType });
      }
    }
    //! add some plugin related checks here?
  }

  async resolveConfig() {
    if (!this._configProcessed) this.processConfig();

    await this.cacheProvider?.load();

    let nodeIdsToResolve = graphlib.alg.topsort(this.nodesDag);
    // console.log('sorted node ids', nodeIdsToResolve);
    let nextBatchNodeIds: Array<string> = [];
    while (nodeIdsToResolve.length) {
      let resolvedCount = 0;
      debug('resolving batch', nodeIdsToResolve);
      for (const nodeId of nodeIdsToResolve) {
        const node = this.nodesByFullPath[nodeId];
        // currently this resolve fn will trigger resolve on nested items
        const nodeWasResolved = node.isResolved;
        await node.resolve();
        // for objects, the node first gets "resolved" but not "fully resolved" (where child values rolled back up)
        // but this is still considered progress so we track it
        if (!nodeWasResolved && node.isResolved) resolvedCount++;
        if (!node.isFullyResolved) {
          nextBatchNodeIds.push(nodeId);
        }
        // notify all plugins about the resolved item in case it resolves an input
        if (node.isFullyResolved && node.parentEntity) {
          for (const plugin of node.parentEntity.ownedPlugins) {
            plugin.attemptInputResolutionsUsingConfigItem(node);
          }
        }
      }

      if (nextBatchNodeIds.length > 0) {
        // if this batch yielded no new resolutions, we can stop
        if (resolvedCount === 0) {
          // TODO: do we want to do anything special here?
          nodeIdsToResolve = [];
        } else {
          nodeIdsToResolve = nextBatchNodeIds;
          nextBatchNodeIds = [];
        }
      } else {
        nodeIdsToResolve = [];
      }
    }

    await this.cacheProvider?.save();
  }

  getItemByPath(fullPath: string) {
    const [entityId, itemPath] = fullPath.split('!');
    const entity = this.entitiesById[entityId];
    if (!entity) throw new Error(`Invalid entity id - ${entityId}`);
    return entity.getConfigNodeByPath(itemPath);
  }

  // CACHING
  private cacheMode: CacheMode = true;
  setCacheMode(cacheMode: typeof this.cacheMode) {
    debug(`Config loader - setting cache mode = ${cacheMode}`);
    this.cacheMode = cacheMode;
  }
  cacheProvider?: ConfigraphCachingProvider;
  async getCacheItem(key: string, nodeFullPath: string): Promise<ConfigValue | undefined> {
    if (!this.cacheProvider || this.cacheMode !== true) return undefined;
    return this.cacheProvider.getItem(key, nodeFullPath);
  }
  async setCacheItem(key: string, value: ConfigValue, nodeFullPath: string) {
    if (!this.cacheProvider || this.cacheMode !== true) return;
    return this.cacheProvider.setItem(key, value, nodeFullPath);
  }
}
