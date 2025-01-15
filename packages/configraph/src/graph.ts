import * as _ from 'lodash-es';
import graphlib from '@dagrejs/graphlib';
import Debug from 'debug';
import { asyncForEach } from 'modern-async';

import { ConfigraphNode } from './config-node';
import { SchemaError } from './errors';
import { ConfigraphEntity, ConfigraphEntityDef } from './entity';
import { ConfigraphPlugin } from './plugin';
import { CacheMode, ConfigraphCachingProvider } from './caching';
import { ConfigValue } from './resolvers';
import { NODE_FULL_PATH_SEP } from './common';
import { ConfigraphDataTypesRegistry } from './data-types';

const debug = Debug('configraph');

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

  getChildEntities(id: string) {
    const outEdges = this.entitiesDag.outEdges(id) || [];
    const childIds = outEdges.filter((e) => {
      const edgeWithData = this.entitiesDag.edge(e.v, e.w);
      return edgeWithData.type === 'parent';
    }).map((e) => e.w);
    return _.values(_.pick(this.entitiesById, childIds || []));
  }

  generateEntityId() {
    if (!this._rootEntityId) return 'configraph_root';
    return `configraph_entity_${Configraph.autoIdEntityCounter++}`;
  }

  addEntity(
    entityDef: ConfigraphEntityDef<EntityMetadata, NodeMetadata>,
  ) {
    return new ConfigraphEntity(
      this,
      entityDef,
    );
  }

  removeEntity(entityId: string) {
    if (!this.entitiesById[entityId]) {
      throw new Error('entity does not exist!');
    }
    delete this.entitiesById[entityId];
    // or do we want to keep it, but mark it as deleted somehow?
  }

  updateEntity(
    entityId: string,
    entityDef: Omit<ConfigraphEntityDef<EntityMetadata, NodeMetadata>, 'id'>,
  ) {
    if (!this.entitiesById[entityId]) {
      throw new Error('entity does not exist!');
    }
    this.entitiesById[entityId].defs.push(entityDef);
  }

  registerEntity(entity: ConfigraphEntity<any, any>) {
    if (this.entitiesById[entity.id]) {
      // TODO: this should likely roll up into a graph level error, rather than exploding
      throw new Error(`Entity IDs must be unique - duplicate id detected "${entity.id}"`);
    }
    // first entity registered will always be considered the root
    if (!this._rootEntityId) this._rootEntityId = entity.id;
    this.entitiesById[entity.id] = entity;
  }

  registerPlugin(plugin: ConfigraphPlugin, parentEntityId?: string) {
    if (this.pluginsById[plugin.instanceId]) {
      // TODO: this should likely roll up into a graph level error, rather than exploding
      throw new Error(`Plugin instance IDs must be unique - duplicate id detected "${plugin.instanceId}"`);
    }
    this.pluginsById[plugin.instanceId] = plugin;
    if (parentEntityId && !this.entitiesById[parentEntityId]) {
      // TODO: make a schema error on the plugin I guess?
      throw new Error(`Invalid parent entity ID "${parentEntityId}" for plugin ${plugin.instanceId}`);
    }

    if (!this._rootEntityId) {
      throw new Error('Root entity must be created before any plugins are registered');
    }
    plugin.initInternalEntity(this, parentEntityId || this._rootEntityId);
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

    // set up graph edges based on entity "parentId"
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
  }

  // TODO: probably could use a better name
  private _configProcessed = false;
  processConfig() {
    this._configProcessed = true;

    // TODO: reset some things here, if we are re-processing

    this.initEntitiesDag();

    const postProcessFns: Array<{
      node: ConfigraphNode,
      fns: Array<() => void>,
    }> = [];
    // first pass of processing config nodes
    for (const entity of _.values(this.entitiesById)) {
      entity.processConfig();
      // TODO: additional entities created via templates are not yet in the entities DAG
    }

    // now process picked config items, since we need the nodes to exist already
    // but this will connect everything and wire up the types properly
    for (const entity of _.values(this.entitiesById)) {
      entity.processPickedConfig();
    }

    // now process resolvers - wires up additional inter entity connections
    // NOTE - not sure if we need to re-sort the entities and rebuild the dag?
    for (const entityId in this.entitiesById) {
      const entity = this.entitiesById[entityId];
      // now that all config nodes exist, process the resolvers
      for (const node of entity.flatConfigNodes) {
        this.nodesDag.setNode(node.fullPath);

        this.nodesByFullPath[node.fullPath] = node;
        // calls process on each item's resolver, and collects "post-processing" functions to call if necessary
        try {
          const nodePostProcessFns = node.valueResolver?.process(node);
          postProcessFns.push({ node, fns: nodePostProcessFns || [] });
          // TODO: handle errors - attach as schema errors to resolver / node?
        } catch (err) {
          //! Not sure about if the error should be attached to the data-type or the node?
          // should probably be attached to the resolver itself instead?
          if (err instanceof SchemaError) {
            node._schemaErrors.push(err);
          } else {
            node._schemaErrors.push(new SchemaError(err as SchemaError));
          }
        }
      }
    }

    // after the entire graph of config nodes have been processed, we'll call post-processing functions
    // this is needed for `collect()` where we need child entities and their nodes to be initialized
    postProcessFns.forEach(({ node, fns }) => {
      fns.forEach((fn) => {
        try {
          fn();
        } catch (err) {
          if (err instanceof SchemaError) {
            //! same note as above about where these errors should live
            node._schemaErrors.push(err);
          } else {
            node._schemaErrors.push(new SchemaError(err as SchemaError));
          }
        }
      });
    });

    // add declared dependencies to the node graph
    for (const [nodePath, node] of Object.entries(this.nodesByFullPath)) {
      for (const [dependsOnPath, dependencyType] of Object.entries(node.dependsOnPathsObj)) {
        // TODO: we could add inject and collect as types to make it clearer?
        this.nodesDag.setEdge(dependsOnPath, nodePath, { type: dependencyType });
      }
    }

    // now we look for cycles based on node dependencies and mark the nodes w/ a schema error
    const nodeCycles = graphlib.alg.findCycles(this.nodesDag);
    for (const nodeCycle of nodeCycles) {
      for (const nodePath of nodeCycle) {
        this.nodesByFullPath[nodePath]._schemaErrors.push(new SchemaError('Detected dependency cycle'));
      }
    }

    //! add some plugin related checks here?
  }

  private cacheCleared = false;
  async resolveConfig() {
    if (!this._configProcessed) this.processConfig();

    await this.cacheProvider?.load();

    let nodeIdsToResolve = graphlib.alg.topsort(this.nodesDag);
    // console.log('sorted node ids', nodeIdsToResolve);
    let nextBatchNodeIds: Array<string> = [];
    while (nodeIdsToResolve.length) {
      let resolvedCount = 0;
      debug('resolving batch', nodeIdsToResolve);
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      await asyncForEach(nodeIdsToResolve, async (nodeId) => {
        const node = this.nodesByFullPath[nodeId];
        // currently this resolve fn will trigger resolve on nested items
        const nodeWasResolved = node.isResolved;
        const nodeWasFullyResolved = node.isFullyResolved;
        await node.resolve();
        // for objects, the node first gets "resolved" but not "fully resolved" (where child values rolled back up)
        // so we make progress (and therefore should continue) if a node transitions to resolved or fully resolved
        if (!nodeWasResolved && node.isResolved) resolvedCount++;
        else if (!nodeWasFullyResolved && node.isFullyResolved) resolvedCount++;
        if (!node.isFullyResolved) {
          nextBatchNodeIds.push(nodeId);
        }
      }, Infinity);
      //! What concurrency limit do we want to impose?

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

  getNode(entityId: string, nodePath: string) {
    // TODO: could use the already indexed nodesByFullPath?
    const entity = this.entitiesById[entityId];
    if (!entity) throw new Error(`Invalid entity id - ${entityId}`);
    return entity.getConfigNodeByPath(nodePath);
  }
  // TODO: deprecate this
  getItemByPath(fullPath: string) {
    const [entityId, itemPath] = fullPath.split(NODE_FULL_PATH_SEP);
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
    if (!this.cacheProvider || this.cacheMode === 'skip') return undefined;
    return this.cacheProvider.getItem(key, nodeFullPath);
  }
  async setCacheItem(key: string, value: ConfigValue, nodeFullPath: string) {
    if (!this.cacheProvider || this.cacheMode === 'skip') return;
    return this.cacheProvider.setItem(key, value, nodeFullPath);
  }
}
