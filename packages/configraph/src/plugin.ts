import _ from 'lodash-es';
import Debug from 'debug';

import { ConfigraphDataTypeDefinitionOrShorthand } from './data-types';
import {
  ConfigValueResolver, ConfigValueResolverDef, createResolver,
  DependencyInvalidResolutionError, DependencyNotResolvedResolutionError,
  getResolverCtx,
  InlineValueResolverDef,
} from './resolvers';
import { ConfigraphEntity } from './entity';
import { SerializedConfigraphPlugin } from './serialization-types';
import { Configraph } from './graph';

export type PluginInputValue = InlineValueResolverDef;

export type PluginPackageMetadata = {
  name: string,
  version: string,
  repositoryUrl?: string,
  websiteUrl?: string,
};

const debug = Debug('configraph:plugins');

function cleanGitUrl(repoUrl: string, directoryPath?: string) {
  if (!repoUrl) return;
  let url = repoUrl.replace(/^git\+/, '').replace(/\.git$/, '');
  // TODO: check if this works for non public github repos
  if (directoryPath) url += `/tree/main/${directoryPath}`;
  return url;
}

export abstract class ConfigraphPlugin<
NodeMetadata = unknown,
EntityClass extends ConfigraphEntity = ConfigraphEntity,
> {
  /** name of the plugin itself - which is the name of the class */
  pluginType = this.constructor.name;
  /** iconify icon name */
  icon?: string;

  get parentEntityId() { return this.internalEntity?.parentId!; }
  injectedByEntityIds: Array<string> = [];

  readonly inputSchema: PluginInputSchema<NodeMetadata>;

  internalEntity?: EntityClass;
  constructor(
    readonly instanceId: string,
    readonly opts: {
      inputSchema: PluginInputSchema<NodeMetadata>,
      packageJson?: any,
    },
  ) {
    this.inputSchema = opts.inputSchema;

    const PluginClass = this.constructor as typeof ConfigraphPlugin;
    if (!PluginClass.packageMetadata && opts.packageJson) {
      PluginClass.packageMetadata = {
        name: opts.packageJson.name,
        version: opts.packageJson.version,
        repositoryUrl: cleanGitUrl(opts.packageJson.repository?.url, opts.packageJson.repository?.directory),
        websiteUrl: opts.packageJson.homepage,
      };
    }
  }

  static packageMetadata?: PluginPackageMetadata;

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
  createResolver(
    defOrFn: ConfigValueResolverDef | (() => ConfigValueResolverDef | ConfigValueResolver),
  ): ConfigValueResolver {
    const r = createResolver(defOrFn);

    r.def.createdByPluginId = this.instanceId;
    if (this.icon) r.icon ||= this.icon;

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


  get packageMetadata() { return (this.constructor as typeof ConfigraphPlugin).packageMetadata; }

  toCoreJSON(): SerializedConfigraphPlugin {
    return {
      instanceId: this.instanceId,
      icon: this.icon,
      parentEntityId: this.parentEntityId,
      injectedByEntityIds: this.injectedByEntityIds,
      pluginType: this.pluginType,
      isValid: this.isValid,
      isSchemaValid: this.isSchemaValid,
      schemaErrors:
        this.schemaErrors?.length
          ? _.map(this.schemaErrors, (err) => err.toJSON())
          : undefined,
      inputNodes: _.mapValues(this.internalEntity?.configNodes, (n) => n.toCoreJSON()),
      usedByConfigItemResolverPaths: _.compact(
        _.map(this.resolvers, (r) => (r.isAttachedToConfigNode ? r.fullPath : undefined)),
      ),
      packageMetadata: this.packageMetadata,
    };
  }
}

/// ////////

export type PluginInputSchema<NodeMetadata> = Record<string, ConfigraphDataTypeDefinitionOrShorthand<NodeMetadata>>;

