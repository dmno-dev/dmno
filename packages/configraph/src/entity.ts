import _ from 'lodash-es';
import Debug from 'debug';
import {
  ConfigraphNode,
  PickedNodeDef,
} from './config-node';
import { SchemaError } from './errors';
import { Configraph } from './graph';
import { ConfigraphPlugin } from './plugin';
import { ConfigValue } from './resolvers';
import { ExternalDocsEntry } from './common';
import { ConfigraphEntityTemplate } from './entity-template';
import { ConfigraphDataTypeDefinitionOrShorthand } from './data-types';

const debug = Debug('configraph');

type NestedOverrideObj<T = string> = {
  [key: string]: NestedOverrideObj<T> | T;
};

export class OverrideSource {
  constructor(
    readonly type: string,
    readonly values: NestedOverrideObj,
    readonly enabled = true,
  ) {}

  /** get an env var override value using a dot notation path */
  getOverrideForPath(path: string) {
    return _.get(this.values, path);
  }
}


export type PickSchemaEntry = {
  /** id of entity to pick from, defaults to root entity */
  entityId?: string;
  /** key(s) to pick, or function that matches against all keys from source */
  key: string | Array<string> | ((key: string) => boolean) | true,

  /** new key name or function to rename key(s) */
  renameKey?: string | ((key: string) => string),

  /** function to transform value(s) */
  transformValue?: (value: any) => any,

  // TOOD: also allow setting the value (not transforming)
  // value?: use same value type as above
};
export type ConfigraphPickSchemaEntryOrShorthand = PickSchemaEntry | string;

//! this needs to support transformations, resolvers, etc?
type EntityOverrideValue = ConfigValue;
type EntityOverridesDef =
  // simpler object notation
  Record<string, EntityOverrideValue>
  // or more verbose array
  | Array<EntityOverrideObjectDef>;
type EntityOverrideObjectDef = { path: string, value: EntityOverrideValue };

/** helper to transform raw overrides more verbose format */
function getEntityOverridesDefs(rawOverrides: EntityOverridesDef) {
  if (_.isArray(rawOverrides)) return rawOverrides;
  return _.map(rawOverrides, (value, path) => ({ value, path }));
}

export type ConfigraphEntityDef<EntityMetadata, NodeMetadata> = EntityMetadata & {
  id?: string,
  parentId?: string,

  extends?: ConfigraphEntityTemplate<EntityMetadata, NodeMetadata>;
  overrides?: EntityOverridesDef;

  configSchema?: Record<string, ConfigraphDataTypeDefinitionOrShorthand<NodeMetadata>>;
  pickSchema?: Array<PickSchemaEntry | string>;

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
  EntityMetadata = unknown,
  NodeMetadata = unknown,
  N extends ConfigraphNode = ConfigraphNode,
> {
  // template: ConfiGraphEntityTemplate;

  readonly id: string;
  parentId?: string;

  configSchema: Record<string, ConfigraphDataTypeDefinitionOrShorthand<NodeMetadata>> = {};
  pickSchema: Array<PickSchemaEntry | string> = [];


  // @ts-ignore
  NodeClass: (new (...args: Array<any>) => N) = ConfigraphNode;

  // processed config nodes
  configNodes: Record<string, InstanceType<typeof this.NodeClass>> = {};

  //! combine into one? not sure...
  injectedPlugins: Array<ConfigraphPlugin> = [];
  ownedPlugins: Array<ConfigraphPlugin> = [];

  state: any;
  private overrideSources = [] as Array<OverrideSource>;

  // /** error encountered while _loading_ the config */
  // readonly configLoadError?: ConfigLoadError;

  /** error within the schema itself */
  readonly schemaErrors: Array<SchemaError> = [];

  constructor(
    readonly graphRoot: Configraph,
    readonly def: ConfigraphEntityDef<EntityMetadata, NodeMetadata>,
    // readonly NodeClass: (new (...args: Array<any>) => N),
  ) {
    // if this entity is using a template, we need to merge the template definition with the specific instance settings
    const entityTemplate = def.extends;
    if (entityTemplate) {
      if (!entityTemplate.entities.length) {
        this.schemaErrors.push(new SchemaError('Entity template is invalid - has no root entity'));
      } else {
        const entityTemplateRoot = entityTemplate.entities[0];
        if (entityTemplateRoot.configSchema) {
          this.configSchema = entityTemplateRoot.configSchema;
        }
        if (entityTemplateRoot.pickSchema) {
          // TODO: need to remap - pick entity IDs
          this.pickSchema = entityTemplateRoot.pickSchema;
        }
      }
    }

    // TODO: add restrictions on naming?
    this.id = def.id || graphRoot.generateEntityId();

    if (def.parentId) {
      if (def.parentId === this.id) {
        this.schemaErrors.push(new SchemaError('Cannot set entity parent to self'));
        this.parentId = graphRoot._rootEntityId;
      } else if (!graphRoot.entitiesById[def.parentId]) {
        this.schemaErrors.push(new SchemaError(`Parent id ${def.parentId} not found - it could be a bad id or you may be initializing entities out of order`));
        this.parentId = graphRoot._rootEntityId;
      } else {
        this.parentId = def.parentId;
      }
    }

    if (def?.pickSchema) this.pickSchema = def?.pickSchema;
    if (def?.configSchema) this.configSchema = def?.configSchema;

    // automatically register, since we are already passing in the graph reference
    graphRoot.registerEntity(this);
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
  >(key: K): ConfigraphEntityDef<EntityMetadata, NodeMetadata>[K] {
    if (key in this.def) return this.def[key];
    let entityTemplate = this.def.extends?.rootEntity;
    while (entityTemplate) {
      if (key in entityTemplate) {
        return entityTemplate[key];
      }
      // templates can extend each other, so we potentially have to follow up a chain
      entityTemplate = entityTemplate.extends?.rootEntity;
    }
    return this.parentEntity?.getDefItem(key as any);
  }

  getMetadata<K extends keyof EntityMetadata>(key: K) {
    return this.getDefItem(key);
  }

  //! these should probably not inherit from parents, but should inherit from a template
  get label() { return this.getDefItem('label'); }
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
    return this.graphRoot.entitiesByParentId[this.id];
  }

  get ancestorIds(): Array<string> {
    if (this.parentId) return [...this.parentEntity!.ancestorIds, this.parentId];
    return [];
  }

  addConfigNode(
    key: string,
    nodeDef: ConfigraphDataTypeDefinitionOrShorthand<NodeMetadata> | PickedNodeDef,
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

  initOverrides() {
    // handle overrides set on the entity template if applicable
    if (this.def.extends && this.def.extends.entities[0].overrides) {
      const entityOverridesFromTemplate = this.def.extends.entities[0].overrides;
      for (const overrideItem of getEntityOverridesDefs(entityOverridesFromTemplate)) {
        const node = this.getConfigNodeByPath(overrideItem.path);

        //! are these actually overrides? something different?
        node.overrides.unshift({
          sourceType: 'entity template',
          icon: '',
          value: overrideItem.value,
        });
      }
    }

    // handle overrides set on this entity definition directly
    if (this.def.overrides) {
      for (const overrideItem of getEntityOverridesDefs(this.def.overrides)) {
        const node = this.getConfigNodeByPath(overrideItem.path);
        node.overrides.unshift({
          sourceType: 'entity definition',
          icon: '',
          value: overrideItem.value,
        });
      }
    }
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
