/* eslint-disable class-methods-use-this */
import { AsyncLocalStorage } from 'node:async_hooks';
import _ from 'lodash-es';
import { ConfigraphNode } from './config-node';
import { ResolutionError, SchemaError } from './errors';
import { SerializedResolver, SerializedResolverBranch } from '.';


// TODO: do we allow Date?
// what to do about null/undefined?
export type ConfigValue =
  undefined |
  string | number | boolean |
  { [key: string]: ConfigValue } |
  Array<ConfigValue>;

type ValueResolverResult = undefined | ConfigValue;
export type ConfigValueInlineFunction =
  (ctx: ResolverContext) => MaybePromise<ValueResolverResult>;
export type InlineValueResolverDef =
  // static value
  ConfigValue |
  // resolver - ex: formula, fetch from vault, etc
  ConfigValueResolver |
  // inline function, which can return a value
  ConfigValueInlineFunction;



type ValueOrValueGetter<T> = T | ((ctx: ResolverContext) => T);
type MaybePromise<T> = T | Promise<T>;

export type ConfigValueResolverDef = {
  /**
   * internal id used for the type of the resolver
   * @internal
   */
  _typeId?: string,

  // TODO-review: changed plugin reference to id, to help decouple?
  // /** reference back to the plugin which created the resolver (if applicable) */
  // createdByPlugin?: DmnoPlugin,
  createdByPluginId?: string,


  /** set a specific icon for the resolver, will default to the plugin's icon if set */
  icon?: ValueOrValueGetter<string>,
  /** label for the resolver */
  label: ValueOrValueGetter<string>,
  /**
   * caching key for the final value
   * this is just a convenience to avoid having to explicityl interact with the caching logic directly
   * */
  cacheKey?: ValueOrValueGetter<string>,

  /**
   * function that will be called while processing the graph's schema
   * useful for validating references to other nodes in the graph are valid
   *
   * optionally can return function(s) that will be called in a second pass after the entire graph has been processed
   */
  process?: (this: ConfigValueResolver) => void | (() => void),
} &
({
  resolve: (ctx: ResolverContext) => MaybePromise<ValueResolverResult>,
} | {
  resolveBranches: Array<ResolverBranchDefinition>
});

export function createResolver(
  defOrFn: ConfigValueResolverDef | (() => ConfigValueResolverDef | ConfigValueResolver),
): ConfigValueResolver {
  if (_.isFunction(defOrFn)) {
    try {
      const result = defOrFn();
      if (result instanceof ConfigValueResolver) return result;
      return new ConfigValueResolver(result);
    } catch (err) {
      return new ConfigValueResolver({
        _typeId: '$error',
        label: 'error',
        process() {
          if (err instanceof SchemaError) {
            this.configNode.schemaErrors.push(err);
          } else {
            this.configNode.schemaErrors.push(new SchemaError(err as Error));
          }
        },
        resolve() {
          return false;
        },
      });
    }
  } else {
    return new ConfigValueResolver(defOrFn);
  }
}

//! maybe do this via a type/errorCode instead of custom class?
export class DependencyNotResolvedResolutionError extends ResolutionError {
  retryable = true;
}
export class DependencyInvalidResolutionError extends ResolutionError {}

type ResolverBranchDefinition = {
  id: string,
  label: string;
  resolver: ConfigValueResolver;
  condition: (ctx: ResolverContext) => boolean;
  isDefault: boolean;
};

export class ConfigValueResolver {
  constructor(readonly def: ConfigValueResolverDef) {
    // TODO: figure out this pattern... we'll have several bits of setings that
    // are either static or need some basic resolution
    if (_.isString(this.def.icon)) this.icon = this.def.icon;
    if (_.isString(this.def.label)) this.label = this.def.label;

    // link the branch resolvers back to their branch definition
    // and to this parent resolver
    // so they can access the branch path if needed
    if ('resolveBranches' in this.def) {
      this.branches = this.def.resolveBranches.map((branchDef) => {
        return new ConfigValueResolverBranch(branchDef, this);
      });
    } else {
      if (!this.def.resolve) {
        // should be protect by TS, but this is an extra check
        throw new Error('expected `resolve` fn in resolver definition');
      }
    }
  }

  // the parent/linked resolver branch, if this is a child of branched resolver
  linkedBranch?: ConfigValueResolverBranch;
  // child resolver branches - for something like `switchBy`
  branches: Array<ConfigValueResolverBranch> | undefined;
  isResolved = false;
  resolvedValue?: ConfigValue;
  isUsingCache = false;

  resolutionError?: ResolutionError;
  get selfOrChildResolutionError(): ResolutionError | undefined {
    if (this.resolutionError) return this.resolutionError;
    if (!this.branches) return;
    for (const b of this.branches) {
      const branchResolutionError = b.def.resolver.selfOrChildResolutionError;
      if (branchResolutionError) return branchResolutionError;
    }
  }

  get isFullyResolved() {
    if (!this.isResolved) return false;
    return !this.selfOrChildResolutionError;
  }

  icon?: string;
  label?: string;

  private _configNode?: ConfigraphNode;
  set configNode(node: ConfigraphNode | undefined) {
    this._configNode = node;
    this.branches?.forEach((branch) => {
      branch.def.resolver.configNode = node;
    });
  }
  get configNode(): ConfigraphNode {
    // this happens if the config parsing fails after some resolvers have been created
    if (!this._configNode) throw new Error('expected resolver configNode to be set');
    return this._configNode;
  }
  get isAttachedToConfigNode() {
    return !!this._configNode;
  }

  get parentResolver() {
    return this.linkedBranch?.parentResolver;
  }
  get branchIdPath(): string | undefined {
    if (!this.linkedBranch) return undefined;
    const thisBranchId = this.linkedBranch.def.id;
    if (this.parentResolver) {
      const parentBranchIdPath = this.parentResolver.branchIdPath;
      if (parentBranchIdPath) {
        return `${this.parentResolver.branchIdPath}/${thisBranchId}`;
      }
    }
    return thisBranchId;
  }

  get fullPath() {
    return _.compact([
      this.configNode?.fullPath,
      this.branchIdPath,
    ]).join('#');
  }

  resetResolutionState() {
    delete this.resolutionError;
    for (const depPath in this.dependsOnPathsObj) {
      if (this.dependsOnPathsObj[depPath] === 'resolution') {
        delete this.dependsOnPathsObj[depPath];
      }
    }
    this.branches?.forEach((b) => {
      b.isActive = false;
      b.resolver.resetResolutionState();
    });
  }



  dependsOnPathsObj: Record<string, 'schema' | 'resolution'> = {};
  getDependencyMap(mode: 'self' | 'all' | 'active' = 'self') {
    const depMap = { ...this.dependsOnPathsObj };
    if (mode === 'self' || !this.branches) return depMap;
    for (const branch of this.branches) {
      if (mode === 'all' || (branch.isActive && mode === 'active')) {
        const branchMap = branch.resolver.getDependencyMap(mode);
        _.each(branchMap, (depType, depNodeId) => {
          depMap[depNodeId] = depType;
        });
      }
    }
    return depMap;
  }
  get dependsOnPaths() { return _.keys(this.dependsOnPathsObj); }

  process(item: ConfigraphNode): void | Array<() => void> {
    const postProcessFns = [];
    // call process fn if one is defined
    const postProcessFn = this.def.process?.call(this);
    if (postProcessFn) postProcessFns.push(postProcessFn);

    // call process on child branches
    for (const b of this.branches || []) {
      const branchPostProcessFns = b.resolver.process(item);
      if (branchPostProcessFns) {
        postProcessFns.push(...branchPostProcessFns);
      }
    }
    if (postProcessFns.length) return postProcessFns;
  }

  async resolve(ctx: ResolverContext) {
    // if we have previously resolved, we need to clear the error, branch active state, etc
    this.resetResolutionState();
    // console.log('> running resolver for item', this.configNode.fullPath);

    if (_.isFunction(this.def.icon)) this.icon = this.def.icon(ctx);
    if (_.isFunction(this.def.label)) this.label = this.def.label(ctx);

    // optional cache key can be static or a fn
    let cacheKey: string | undefined;
    if (_.isString(this.def.cacheKey)) cacheKey = this.def.cacheKey;
    else if (_.isFunction(this.def.cacheKey)) {
      // TODO: should add error handling here
      cacheKey = this.def.cacheKey(ctx);
    }
    // if a cache key is set, we first check the cache and return that value if found
    if (cacheKey) {
      // console.log(kleur.bgMagenta(`CHECK VALUE CACHE FOR KEY: ${this.cacheKey}`));
      const cachedValue = await ctx.getCacheItem(cacheKey);
      if (cachedValue !== undefined) {
        // console.log(kleur.bgMagenta('> USING CACHED VALUE!'));
        this.resolvedValue = cachedValue;
        this.isResolved = true;
        this.isUsingCache = true;
        return;
      }
    }

    // deal with branched case (ex: switch / if-else)
    if (this.branches) {
      // find first branch that passes
      let matchingBranch = _.find(this.branches, (branch) => {
        if (branch.def.isDefault) return false;
        try {
          return branch.def.condition(ctx);
        } catch (err) {
          this.resolutionError = new ResolutionError(`Error in resolver branch condition (${branch.def.label})`, { err: err as Error });
        }
        return false;
      });
      // bail early if we failed evaluating resolver conditions
      if (this.resolutionError) {
        this.isResolved = false;
        return;
      }

      if (!matchingBranch) {
        matchingBranch = _.find(this.branches, (branch) => branch.def.isDefault);
      }

      _.each(this.branches, (branch) => {
        branch.isActive = branch === matchingBranch;
      });

      // TODO: might be able to force a default to be defined?
      if (!matchingBranch) {
        this.resolutionError = new ResolutionError('no matching resolver branch found and no default');
        return false;
      }
      // resolutionResult is now a child resolver which must be resolved itself
      // NOTE we have to call this recursively so that caching can be triggered on each resolver
      const matchingBranchResolver = matchingBranch.def.resolver;
      const childCtx = new ResolverContext(matchingBranchResolver);
      // TODO: deal with errors - and need to bubble them up...?
      await matchingBranchResolver.resolve(childCtx);
      this.resolvedValue = matchingBranchResolver.resolvedValue;
      this.isResolved = true;

    // deal with normal case
    } else {
      // should always be the case, since resolvers must have branches or a resolve fn
      if (!('resolve' in this.def)) {
        this.resolutionError = new ResolutionError('expected `resolve` fn in resolver definition');
        return;
      }

      // actually call the resolver
      try {
        this.resolvedValue = await this.def.resolve(ctx);
        this.isResolved = true;
      } catch (err) {
        if (err instanceof ResolutionError) {
          this.resolutionError = err;
        } else {
          this.resolutionError = new ResolutionError(err as Error);
        }
        this.isResolved = false;
        return;
      }
    }

    // save result in cache if this resolver has a cache key
    if (cacheKey && this.resolvedValue !== undefined && this.resolvedValue !== null) {
      // console.log(kleur.bgMagenta(`SAVE CACHED VALUE IN KEY: ${this.cacheKey}`));
      await ctx.setCacheItem(cacheKey, this.resolvedValue);
    }
  }

  toJSON(): SerializedResolver {
    return {
      isResolved: this.isResolved,
      icon: this.icon,
      label: this.label,
      createdByPluginId: this.def.createdByPluginId,
      // itemPath: this.configItem?.fullPath,
      // branchIdPath: this.branchIdPath,
      ...this.branches && {
        branches: this.branches.map((b) => b.toJSON()),
      },
      resolvedValue: this.resolvedValue,
      resolutionError: this.resolutionError?.toJSON(),
    };
  }
}
export class ConfigValueResolverBranch {
  constructor(
    readonly def: ResolverBranchDefinition,
    readonly parentResolver: ConfigValueResolver,
  ) {
    // link the branch definition resolver back to this object
    this.def.resolver.linkedBranch = this;
  }

  isActive?: boolean;
  get id() { return this.def.id; }
  get label() { return this.def.label; }
  get isDefault() { return this.def.isDefault; }
  get resolver() { return this.def.resolver; }

  toJSON(): SerializedResolverBranch {
    return {
      id: this.id,
      label: this.label,
      isDefault: this.isDefault,
      isActive: this.isActive,
      resolver: this.resolver.toJSON(),
    };
  }
}

export function processInlineResolverDef(resolverDef: InlineValueResolverDef) {
  // set up value resolver

  // inline function case
  if (_.isFunction(resolverDef)) {
    return createResolver({
      _typeId: '$fn',
      icon: 'f7:function',
      label: 'fn',
      resolve: resolverDef,
    });

  // already a resolver case
  } else if (resolverDef instanceof ConfigValueResolver) {
    return resolverDef;

  // static value case - including explicitly setting to `undefined
  } else if (
    _.isString(resolverDef) || _.isNumber(resolverDef) || _.isBoolean(resolverDef)
    || _.isPlainObject(resolverDef)
    || resolverDef === undefined
  ) {
    return createResolver({
      _typeId: '$static',
      icon: 'bi:dash',
      label: 'static',
      resolve: async () => resolverDef,
    });
  } else {
    console.log(resolverDef);
    throw new Error('invalid resolver definition');
  }
}

export class ResolverContext {
  // TODO: the item has everything we need, but is it what we want to pass in?
  // lots of ? and ! on ts types here because data doesn't exist at init time...
  readonly resolver?: ConfigValueResolver;
  private configNode: ConfigraphNode;
  constructor(
    // private configItem: DmnoConfigItemBase,
    resolverOrNode: ConfigValueResolver | ConfigraphNode,
  ) {
    if (resolverOrNode instanceof ConfigValueResolver) {
      this.resolver = resolverOrNode;
      this.configNode = this.resolver.configNode!;
    } else {
      this.configNode = resolverOrNode;
    }
  }

  get entity() {
    return this.configNode.parentEntity;
  }
  get entityId() {
    return this.entity?.id;
  }
  get nodePath() {
    return this.configNode.path;
  }
  get nodeFullPath() {
    return this.configNode.fullPath;
  }
  get resolverFullPath() {
    return this.resolver ? this.resolver.fullPath : this.nodeFullPath;
  }
  get resolverBranchIdPath() {
    return this.resolver?.branchIdPath;
  }

  dependsOnPathsObj: Record<string, boolean> = {};
  get dependsOnPaths() { return _.keys(this.dependsOnPathsObj); }

  get(nodePath: string): any {
    const node = this.entity?.getConfigNodeByPath(nodePath);
    if (!node) {
      throw new Error(`Tried to get config node that does not exist "${nodePath}"`);
    }

    // just checking in case... can probably remove later
    if (node.path !== nodePath) throw new Error('node path did not match');

    // could track more info here - like if we are waiting for it
    // for now we'll track in several places, not sure yet how we want to roll it up
    const itemFullPath = node.fullPath;
    this.dependsOnPathsObj[itemFullPath] = true;
    if (this.resolver) this.resolver.dependsOnPathsObj[itemFullPath] ||= 'resolution';

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

  // TODO: needs a better name -
  // get the values of items we declared dependencies for during process()
  getDeclaredDependencyValues() {
    return _.mapValues(this.resolver?.dependsOnPathsObj, (depType, fullPath) => {
      // TODO: review how these errors are dealt with, currently we are bailing at the first error, but we may want to collect multiple?
      const depNode = this.configNode.parentEntity?.graphRoot.getItemByPath(fullPath);
      if (!depNode) {
        throw new ResolutionError(`Invalid declared dependency path - ${fullPath}`);
      }
      if (!depNode.isFullyResolved) {
        throw new DependencyNotResolvedResolutionError('dependency not resolved yet');
      }
      if (!depNode.isValid) {
        throw new ResolutionError('declared dependency is resolved but not valid');
      }
      return depNode.resolvedValue;
    });
  }


  async getCacheItem(key: string) {
    return this.entity?.graphRoot.getCacheItem(key, this.nodeFullPath);
  }
  async setCacheItem(key: string, value: ConfigValue) {
    if (value === undefined || value === null) return;
    return this.entity?.graphRoot.setCacheItem(key, value, this.nodeFullPath);
  }
  async getOrSetCacheItem(key: string, getValToWrite: () => Promise<ConfigValue>) {
    const cachedValue = await this.getCacheItem(key);
    if (cachedValue !== undefined) return cachedValue;
    const val = await getValToWrite();
    await this.setCacheItem(key, val);
    return val;
  }
}

export const resolverCtxAls = new AsyncLocalStorage<ResolverContext>();
export function getResolverCtx() {
  const ctx = resolverCtxAls.getStore();
  if (!ctx) throw new Error('unable to find resolver ctx in ALS');
  return ctx;
}
