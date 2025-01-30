import * as _ from 'lodash-es';
import Debug from 'debug';
import {
  ConfigraphNode,
  PickedNodeDef,
  VIRTUAL_CHILD_KEY,
} from './config-node';
import { SchemaError } from './errors';
import { Configraph } from './graph';
import { ConfigraphPlugin } from './plugin';
import {
  ENTITY_TEMPLATE_ID_SEP, ExternalDocsEntry, VALID_NODE_KEY_REGEX, VALID_NODE_PATH_REGEX,
} from './common';
import { ConfigraphEntityTemplate } from './entity-template';
import {
  ConfigraphBaseTypes, ConfigraphDataTypeDefinition,
  ConfigraphDataTypeDefinitionOrShorthand, expandDataTypeDefShorthand,
} from './data-types';
import { PickedDataType } from './pick';

const debug = Debug('configraph');

export type ConfigraphEntityDef<EntityMetadata, NodeMetadata> = EntityMetadata & {
  id?: string,
  parentId?: string,

  extends?: (entity: ConfigraphEntity) => ConfigraphEntityTemplate<EntityMetadata, NodeMetadata>;

  configSchema?: Record<string, ConfigraphDataTypeDefinitionOrShorthand<NodeMetadata>>;

  // additional entity-level validations for checking combinations of things
  // ? would array of validation fns be better?
  validate?: () => boolean,
  asyncValidate?: () => Promise<boolean>,

  // additional metadata, similar to data types to be able to display in a UI
  // unclear if all of this is needed, or should live on a template or both??
  label?: string, // human readable name
  summary?: string, // short description
  description?: string, // longer description, supports markdown
  externalDocs?: ExternalDocsEntry | Array<ExternalDocsEntry>,

  /** icon to use, see https://icones.js.org/ for available options
  * @example mdi:aws
  */
  icon?: string;

  /** color (any valid css color)
  * @example FF0000
  */
  color?: string;
};


// type ExtractNodeMetadata<ConfigraphNodeSubclass> = ConfigraphNodeSubclass extends ConfigraphNode<infer X> ? X : never;

export class ConfigraphEntity<
  EntityMetadata extends Record<string, any> = {},
  NodeMetadata extends Record<string, any> = {},
  N extends ConfigraphNode = ConfigraphNode,
> {
  // readonly id: string;

  /** complete id - must be unique within the graph */
  id: string;
  templateIdBase?: string;

  /** complete parent id */
  parentId?: string;

  // @ts-ignore
  NodeClass: (new (...args: Array<any>) => N) = ConfigraphNode;

  // processed config nodes
  configNodes: Record<string, InstanceType<typeof this.NodeClass>> = {};

  //! combine into one? not sure...
  injectedPlugins: Array<ConfigraphPlugin> = [];
  ownedPlugins: Array<ConfigraphPlugin> = [];

  // /** error encountered while _loading_ the config */
  // readonly configLoadError?: ConfigLoadError;

  /** error within the schema itself */
  readonly schemaErrors: Array<SchemaError> = [];

  // private templateChain: Array<ConfigraphEntityTemplate<EntityMetadata, NodeMetadata>> = [];
  public defs: Array<ConfigraphEntityDef<EntityMetadata, NodeMetadata>> = [];

  readonly graphRoot: Configraph;
  readonly templateRootEntity?: ConfigraphEntity<EntityMetadata, NodeMetadata>;

  constructor(
    /**
     * reference to the configraph root
     * or if this entity is being created by a template, then to the root entity of that template
     * */
    readonly graphOrTemplateRoot: Configraph<any, any> | ConfigraphEntity<EntityMetadata, NodeMetadata>,
    readonly def: ConfigraphEntityDef<EntityMetadata, NodeMetadata>,
  ) {
    // TODO: add restrictions on id/naming?
    if (graphOrTemplateRoot instanceof Configraph) {
      this.graphRoot = graphOrTemplateRoot;
      this.id = def.id || this.graphRoot.generateEntityId();
      if (def.parentId) {
        this.parentId = def.parentId;

      // default to being a child of the graph root
      // but root entity id isn't set yet if this entity is the root
      } else if (this.graphRoot._rootEntityId) {
        this.parentId = this.graphRoot._rootEntityId;
      }
    } else {
      this.graphRoot = graphOrTemplateRoot.graphRoot;
      this.templateRootEntity = graphOrTemplateRoot;

      // the id defined within the template is relative to the template only
      this.id = `${this.templateRootEntity.templateIdBase}${
        def.id || `child-${this.templateRootEntity.childEntities.length}`}`;

      if (def.parentId) {
        // remap parent id within template to full id
        this.parentId = [
          ...this.templateRootEntity.id
            .split(ENTITY_TEMPLATE_ID_SEP)
            .slice(0, -1), def.parentId,
        ].join(ENTITY_TEMPLATE_ID_SEP);
      } else {
        // defaults to being child of the template root
        this.parentId = this.templateRootEntity.id;
      }
    }


    let currentTemplateFn = def.extends;
    let templateCount = 0;
    const templateChain: Array<ConfigraphEntityTemplate> = [];
    while (currentTemplateFn) {
      // we know know this entity is the base of a template so we need to track this id as the "root" for other template-relateive ids
      if (templateCount === 0) {
        this.templateIdBase = this.id + ENTITY_TEMPLATE_ID_SEP;
      }

      const initializedTemplate = currentTemplateFn(this);
      templateChain.unshift(initializedTemplate);

      // and now we'll add an extra id suffix ex: 'someTemplateInstance*root'
      if (templateCount === 0) {
        this.id += `${ENTITY_TEMPLATE_ID_SEP}${initializedTemplate.rootEntityDef.id || 'root'}`;
      }


      // follow up the chain if necessary
      currentTemplateFn = initializedTemplate.rootEntityDef.extends;
      templateCount++;
    }

    if (this.parentId) {
      // make sure an entity cannot be set to be the child of itself
      if (this.parentId === this.id) {
        this.parentId = this.templateRootEntity?.id || this.graphRoot._rootEntityId;
        this.schemaErrors.push(new SchemaError('Cannot set entity parent to self'));
      } else if (!this.graphRoot.entitiesById[this.parentId]) {
        this.schemaErrors.push(new SchemaError(`Parent id ${def.parentId} not found - it could be a bad id or you may be initializing entities out of order`));
        this.parentId = this.templateRootEntity?.id || this.graphRoot._rootEntityId;
      }
    }

    // automatically register, since we are already passing in the graph reference
    this.graphRoot.registerEntity(this);

    // now walk up the template chain and add/update/remove additional entities from those templates
    for (const currentTemplate of templateChain || []) {
      for (let i = 0; i < currentTemplate.addedEntityDefs.length; i++) {
        // we cannot mutate the actual definition, so we clone it
        // might want to change that in the future?
        const entityDef = _.cloneDeep(currentTemplate.addedEntityDefs[i]);
        const isTemplateRootEntity = i === 0;

        if (isTemplateRootEntity) {
          this.defs.push(entityDef);
        } else {
          // pass in a reference to _this_ entity, so we know which entity is linked to the template that created this
          const newEntity = new ConfigraphEntity(this, entityDef);
        }
      }
      for (const entityIdToUpdate in currentTemplate.updatedEntityDefs) {
        const updatedEntityDef = currentTemplate.updatedEntityDefs[entityIdToUpdate];
        // UPDATE
        const fullEntityId = `${this.templateIdBase}${entityIdToUpdate}`;
        const entityToUpdate = this.graphRoot.entitiesById[fullEntityId];
        if (!entityToUpdate) {
          this.schemaErrors.push(new SchemaError(`Template tried to update invlaid id - ${entityIdToUpdate}`));
        } else {
          entityToUpdate.defs.push(updatedEntityDef);
        }
      }
      for (const entityIdToRemove of currentTemplate.removedEntityIds) {
        // REMOVE
        const fullEntityId = `${this.templateIdBase}${entityIdToRemove}`;
        const entityToRemove = this.graphRoot.entitiesById[fullEntityId];

        if (!entityToRemove) {
          this.schemaErrors.push(new SchemaError(`Template tried to remove invalid id - ${entityIdToRemove}`));
        } else {
          // TODO: probably want to store it but mark as removed?
          delete this.graphRoot.entitiesById[fullEntityId];
        }
      }
    }

    // now add the actual entity definition to the chain
    this.defs.push(def);
  }

  private initOrUpdateConfigNode(
    nodePath: string,
    typeDef: ConfigraphDataTypeDefinitionOrShorthand<NodeMetadata>,
  ) {
    const expandedTypeDef = expandDataTypeDefShorthand(typeDef);

    if (!VALID_NODE_PATH_REGEX.test(nodePath)) {
      this.schemaErrors.push(new SchemaError(`Invalid config node path: ${nodePath}`));
      return;
    }

    if (nodePath.includes('.')) {
      // TODO: will need to deal with arrays/maps and how we target the child type
      // maybe something like `arrayNode.*`?

      let existingNode: ConfigraphNode<any> | undefined;
      try {
        // first check if a node at that path already exists
        existingNode = this.getConfigNodeByPath(nodePath);
      } catch (err) {
        // nothing to do here - but the fn above throws
      }
      if (existingNode) {
        existingNode.applyOverrideType(expandedTypeDef);
      } else {
        const pathParts = nodePath.split('.');
        const newChildKey = pathParts.pop()!;
        const parentPath = pathParts.join('.');
        try {
          existingNode = this.getConfigNodeByPath(parentPath);
        } catch (err) {}

        // TODO: need to walk the full path and initialize multiple nodes along the way, not just the last
        if (existingNode) {
          const NodeClass = existingNode.constructor as any;
          if (existingNode.type.isType(ConfigraphBaseTypes.object)) {
            existingNode.children[newChildKey] = new NodeClass(newChildKey, expandedTypeDef, existingNode);
          } else if (existingNode.type.isType(ConfigraphBaseTypes.array)) {
            const arrayItemTypeDef = existingNode.children[VIRTUAL_CHILD_KEY].type.typeDef;
            // initialize the new child node using the array child placeholder
            existingNode.children[newChildKey] = new NodeClass(newChildKey, arrayItemTypeDef, existingNode);
            // apply the override on top
            existingNode.children[newChildKey].applyOverrideType(expandedTypeDef);
          } else {
            this.schemaErrors.push(new SchemaError(`Cannot add new child to non-object node: ${parentPath}`));
            return;
          }
        } else {
          this.schemaErrors.push(new SchemaError(`Existing node not found to modify: ${parentPath}`));
          return;
        }
      }
    }

    if (!this.configNodes[nodePath]) {
      if (!nodePath.match(VALID_NODE_KEY_REGEX)) {
        this.schemaErrors.push(new SchemaError(`Invalid node key "${nodePath}"`));
        return;
      }

      const newNode = new (this.NodeClass)(nodePath, expandedTypeDef, this);
      this.configNodes[nodePath] = newNode;
    } else {
      // apply new type definition as an override to the node / its type
      const existingNode = this.configNodes[nodePath];
      existingNode.applyOverrideType(expandedTypeDef);
    }
  }

  processConfig() {
    // all the definition from templates have already been collected into an array
    // so now we just need to process all the config nodes
    for (const def of this.defs) {
      _.each(def.configSchema, (nodeDef, nodePath) => {
        this.initOrUpdateConfigNode(nodePath, nodeDef);
      });
    }
  }
  processPickedConfig() {
    _.each(this.flatConfigNodes, (node) => {
      //! need to handle the entire type chain and overrides!
      if (node.type.typeDef.extends instanceof PickedDataType) {
        const pickedDataType = node.type.typeDef.extends;
        // to finish wiring up the "picked" type, we need to know the current key and access to the graph, so we pass in the node
        pickedDataType.finishInit(node);
      }
    });
  }

  addOwnedPlugin(plugin: ConfigraphPlugin) {
    // TODO: clean this up!
    this.graphRoot.registerPlugin(plugin, this.id);
    debug('registering plugin with entity', plugin.instanceId, this.id);
    this.ownedPlugins.push(plugin);
  }
  addInjectedPlugin(plugin: ConfigraphPlugin) {
    plugin.injectedByEntityIds?.push(this.id);
    this.injectedPlugins.push(plugin);
  }


  private getDefItem<
    K extends keyof ConfigraphEntityDef<EntityMetadata, NodeMetadata>,
  >(
    key: K,
    opts?: {
      inheritable?: Boolean,
    },
  ): ConfigraphEntityDef<EntityMetadata, NodeMetadata>[K] | undefined {
    // walk the chain of definitions which includes everything from templates and the actual instance
    for (let i = this.defs.length - 1; i >= 0; i--) {
      const def = this.defs[i];
      if (key in def) return def[key];
    }

    // otherwise we'll inherit from parent entity
    if (opts?.inheritable) {
      return this.parentEntity?.getDefItem(key as any);
    }
  }

  getMetadata<K extends keyof EntityMetadata>(key: K, opts?: {
    inheritable?: Boolean,
  }) {
    return this.getDefItem(key, opts);
  }

  //! these should probably not inherit from parents, but should inherit from a template
  get label() { return this.getDefItem('label'); }
  get summary() { return this.getDefItem('summary'); }
  get description() { return this.getDefItem('description'); }
  get color() { return this.getDefItem('color'); }
  get icon() { return this.getDefItem('icon'); }

  get isRoot() {
    return this.graphRoot.rootEntity === this;
  }
  get parentEntity(): ConfigraphEntity | undefined {
    if (this.parentId) {
      const parent = this.graphRoot.entitiesById[this.parentId];
      if (!parent) throw new Error(`Unable to find parent entity: ${this.parentId}`);
      return parent;
    }
    if (this.isRoot) return undefined;
    // everything defaults to being a child of the root if not specified
    return this.graphRoot.rootEntity;
  }
  get childEntities(): Array<ConfigraphEntity> {
    return this.graphRoot.getChildEntities(this.id);
  }

  get ancestorIds(): Array<string> {
    if (this.parentId) return [...this.parentEntity!.ancestorIds, this.parentId];
    return [];
  }

  addConfigNode(
    key: string,
    nodeDef: ConfigraphDataTypeDefinition<NodeMetadata> | PickedNodeDef,
  ) {
    const node = new (this.NodeClass)(key, nodeDef, this);

    if (this.configNodes[node.key]) {
      // might want to expose more info here? or keep it under a modified key?
      this.schemaErrors.push(new SchemaError(`Config keys must be unique, duplicate detected - "${node.key}"`));
    } else {
      this.configNodes[node.key] = node;
    }
  }

  getConfigNodeByPath(path: string) {
    const pathParts = path.split('.');
    let currentNode: ConfigraphNode = this.configNodes[pathParts[0]];
    // TODO: we'll need some smarter logic if path is reaching _into values_ of an object/array/map
    for (let i = 1; i < pathParts.length; i++) {
      const pathPart = pathParts[i];
      if (_.has(currentNode.children, pathPart)) {
        currentNode = currentNode.children[pathPart];
        if (!currentNode) {
          throw new Error(`Trying to access ${this.id} / ${path} failed at ${pathPart}`);
        }
      } else {
        throw new Error(`Trying to access ${this.id} / ${path} failed at ${pathPart}`);
      }
    }
    return currentNode;
  }

  //! need to review isSchemaValid vs isValid
  get isSchemaValid() {
    //! configLoadingError removed because we are no longer loading here...
    // if (this.configLoadError) return false;
    if (this.schemaErrors?.length) return false;
    if (!_.every(_.values(this.configNodes), (node) => node.isSchemaValid)) return false;
    return true;
  }

  get isValid() {
    if (!this.isSchemaValid) return false;
    if (!_.every(_.values(this.configNodes), (node) => node.isValid)) return false;
    return true;
  }


  get flatConfigNodes() {
    return _.flatMapDeep(this.configNodes, (node) => {
      return [node, node.flatChildren];
    });
  }

  toCoreJSON() {
    return {
      id: this.id,
      parentId: this.parentId,
      isSchemaValid: this.isSchemaValid,
      isValid: this.isValid,
      isResolved: true,
      schemaErrors:
        this.schemaErrors?.length
          ? _.map(this.schemaErrors, (err) => err.toJSON())
          : undefined,
      ownedPluginIds: _.map(this.ownedPlugins, (p) => p.instanceId),
      injectedPluginIds: _.map(this.injectedPlugins, (p) => p.instanceId),
      color: this.color,
      icon: this.icon,
      // configNodes: _.mapValues(this.configNodes, (item, _key) => item.toJSON()),
    };
  }
}


export type NodeCtor<ChildClass extends ConfigraphNode = ConfigraphNode> =
  { new (): ChildClass } & typeof ConfigraphNode;
