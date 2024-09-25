import _ from 'lodash-es';
import Debug from 'debug';

import { ConfigraphDataTypeDefinitionOrShorthand } from './data-types';
import {
  ConfigValueResolver, createResolver,
  DependencyInvalidResolutionError, DependencyNotResolvedResolutionError,
  getResolverCtx,
  InlineValueResolverDef,
} from './resolvers';
import { ConfigraphEntity } from './entity';
import { SerializedConfigraphPlugin } from './serialization-types';
import { Configraph } from './graph';

export type PluginInputValue = InlineValueResolverDef;

const debug = Debug('configraph:plugins');

export abstract class ConfigraphPlugin<
NodeMetadata = unknown,
EntityClass extends ConfigraphEntity = ConfigraphEntity,
> {
  /** name of the plugin itself - which is the name of the class */
  pluginType = this.constructor.name;
  /** iconify icon name */
  icon?: string;

  get parentEntityId() { return this.internalEntity?.parentId!; }

  readonly inputSchema: PluginInputSchema<NodeMetadata>;

  internalEntity?: EntityClass;
  constructor(
    readonly instanceId: string,
    readonly opts: {
      inputSchema: PluginInputSchema<NodeMetadata>,
    },
  ) {
    this.inputSchema = opts.inputSchema;
  }


  // @ts-ignore
  EntityClass: (new (...args: Array<any>) => N) = ConfigraphEntity;

  initInternalEntity(graphRoot: Configraph, parentEntityId: string) {
    this.internalEntity = new this.EntityClass(graphRoot, {
      // TODO: something better for the id? figure out what characters are reserved?
      id: `$PLUGINS/${this.instanceId}`,
      parentId: parentEntityId,
      configSchema: this.inputSchema,
    });
  }


  resolvers: Array<ConfigValueResolver> = [];
  createResolver(def: Parameters<typeof createResolver>[0]): ReturnType<typeof createResolver> {
    const r = createResolver({
      createdByPluginId: this.instanceId,
      ...def,
    });
    this.resolvers.push(r);
    return r;
  }

  /** fetch a resolved plugin input value within a resolver function */
  inputValue(inputKey: string) {
    // NOTE - this code is _very_ similar to `ResolverContext.get`!
    // except we are getting a plugin input node, rather than a node within the current entity

    if (!this.internalEntity) {
      throw new Error('Plugin entity is not initialized yet');
    }

    // we dont have access to the current resolver ctx unless we force the user to pass it in
    // so we grab it using ALS
    const ctx = getResolverCtx();

    const nodePath = inputKey;
    // we get the node from the plugin's attached graph entity
    const node = this.internalEntity.getConfigNodeByPath(nodePath);

    if (!node) {
      throw new Error(`Tried to get plugin input node that does not exist "${nodePath}"`);
    }

    // just checking in case... can probably remove later
    if (node.path !== nodePath) throw new Error('node path did not match');

    // could track more info here - like if we are waiting for it
    // for now we'll track in several places, not sure yet how we want to roll it up
    const itemFullPath = node.fullPath;
    ctx.dependsOnPathsObj[itemFullPath] = true;
    if (ctx.resolver) ctx.resolver.dependsOnPathsObj[itemFullPath] ||= 'resolution';

    // TODO: might need something like this to support tracking deps in coerce/validate
    // this.configItem.dependsOnPathsObj[itemPath] = true;

    if (!node.isResolved) {
      throw new DependencyNotResolvedResolutionError(
        `Tried to access node that was not yet resolved - ${nodePath}`,
      );
    }
    if (!node.isValid) {
      throw new DependencyInvalidResolutionError(
        `Resolver tried to use node that is invalid - ${nodePath}`,
      );
    }

    return node.resolvedValue;
  }

  get inputNodes() { return this.internalEntity?.configNodes; }
  get isValid() { return this.internalEntity?.isValid; }
  get isSchemaValid() { return this.internalEntity?.isSchemaValid; }
  get schemaErrors() { return this.internalEntity?.schemaErrors; }


  toCoreJSON(): SerializedConfigraphPlugin {
    return {
      instanceId: this.instanceId,
      parentEntityId: this.parentEntityId,
      pluginType: this.pluginType,
      isValid: this.isValid,
      isSchemaValid: this.isSchemaValid,
      schemaErrors:
        this.schemaErrors?.length
          ? _.map(this.schemaErrors, (err) => err.toJSON())
          : undefined,
      inputNodes: _.mapValues(this.internalEntity?.configNodes, (n) => n.toCoreJSON()),
      usedByConfigItemResolverPaths: _.map(this.resolvers, (r) => r.fullPath),
    };
  }
}

/// ////////

export type PluginInputSchema<NodeMetadata> = Record<string, ConfigraphDataTypeDefinitionOrShorthand<NodeMetadata>>;

