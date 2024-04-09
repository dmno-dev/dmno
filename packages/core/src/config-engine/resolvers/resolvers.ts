/* eslint-disable class-methods-use-this */
import _ from 'lodash-es';
import {
  DmnoConfigItemBase, ResolverContext,
} from '../config-engine';
import { ResolutionError } from '../errors';
import { DmnoPlugin } from '../plugins';
import { SerializedResolver } from '../../config-loader/serialization-types';

// TODO: do we allow Date?
// what to do about null/undefined?
export type ConfigValue = string | number | boolean | null | { [key: string]: ConfigValue } | Array<ConfigValue>;

type ValueResolverResult = undefined | ConfigValue;
type ConfigValueInlineFunction =
  (ctx: ResolverContext) => MaybePromise<ValueResolverResult>;
export type InlineValueResolverDef =
  // static value
  ConfigValue |
  // resolver - ex: formula, fetch from vault, etc
  ConfigValueResolver |
  // inline function, which can return a value or another resolver
  ConfigValueInlineFunction;



export type ConfigValueOverride = {
  /** the value of the override */
  value: ConfigValue;

  /** comments about the item from the file */
  comments?: string

  // TODO: this will get more complex, as env files can be in different levels of the project
  /** where does the value come from */
  source: string;
  /**
   * some overrides apply only in certan envs, for example if coming from `.env.production` */
  envFlag?: string;
};



type ValueOrValueGetter<T> = T | ((ctx: ResolverContext) => T);
type MaybePromise<T> = T | Promise<T>;

type ResolverDefinition = {
  /** reference back to the plugin which created the resolver (if applicable) */
  createdByPlugin?: DmnoPlugin,
  /** set a specific icon for the resolver, will default to the plugin's icon if set */
  icon?: ValueOrValueGetter<string>,
  /** label for the resolver */
  label: ValueOrValueGetter<string>,
  /**
   * caching key for the final value
   * this is just a convenience to avoid having to explicityl interact with the caching logic directly
   * */
  cacheKey?: ValueOrValueGetter<string>,
} &
({
  resolve: (ctx: ResolverContext) => MaybePromise<ValueResolverResult>,
} | {
  resolveBranches: Array<ResolverBranch>
});

export function createResolver(def: ResolverDefinition) {
  return new ConfigValueResolver(def);
}




type ResolverBranch = {
  id: string,
  label: string;
  resolver: ConfigValueResolver;
  condition: (ctx: ResolverContext) => boolean;
  isDefault: boolean;
  isActive?: boolean;
};

export class ConfigValueResolver {
  constructor(readonly def: ResolverDefinition) {
    // TODO: figure out this pattern... we'll have several bits of setings that
    // are either static or need some basic resolution
    if (_.isString(this.def.icon)) this.icon = this.def.icon;
    if (_.isString(this.def.label)) this.label = this.def.label;

    // link the branch resolvers back to their branch definition
    // and to this parent resolver
    // so they can access the branch path if needed
    if ('resolveBranches' in this.def) {
      _.each(this.def.resolveBranches, (branchDef) => {
        branchDef.resolver.branchDef = branchDef;
        branchDef.resolver.parentResolver = this;
      });
    }
  }

  isResolved = false;
  resolvedValue?: ConfigValue;
  isUsingCache = false;

  resolutionError?: ResolutionError;

  icon?: string;
  label?: string;

  private _configItem?: DmnoConfigItemBase;
  set configItem(configItem: DmnoConfigItemBase | undefined) {
    this._configItem = configItem;
    if ('resolveBranches' in this.def) {
      _.each(this.def.resolveBranches, (branch) => {
        branch.resolver.configItem = configItem;
      });
    }
  }
  get configItem() {
    return this._configItem;
  }

  parentResolver?: ConfigValueResolver;
  branchDef?: ResolverBranch;

  get branchIdPath(): string | undefined {
    if (!this.branchDef) return undefined;
    if (this.parentResolver) {
      const parentBranchIdPath = this.parentResolver.branchIdPath;
      if (parentBranchIdPath) {
        return `${this.parentResolver.branchIdPath}/${this.branchDef.id}`;
      }
    }
    return this.branchDef?.id;
  }

  getFullPath() {
    return _.compact([
      this.configItem?.getFullPath(),
      this.branchIdPath,
    ]).join('#');
  }


  async resolve(ctx: ResolverContext) {
    if (_.isFunction(this.def.icon)) this.icon = this.def.icon(ctx);
    if (_.isFunction(this.def.label)) this.label = this.def.label(ctx);

    // optional cache key can be static or a fn
    let cacheKey: string | undefined;
    if (_.isString(this.def.cacheKey)) cacheKey = this.def.cacheKey;
    else if (_.isFunction(this.def.cacheKey)) {
      // TODO: should add error handling here
      cacheKey = await this.def.cacheKey(ctx);
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

    let resolutionResult: ConfigValueResolver | ValueResolverResult;

    // deal with branched case (ex: switch / if-else)
    if ('resolveBranches' in this.def) {
      // find first branch that passes
      let matchingBranch = _.find(this.def.resolveBranches, (branch) => {
        if (branch.isDefault) return false;
        return branch.condition(ctx);
      });
      if (!matchingBranch) {
        matchingBranch = _.find(this.def.resolveBranches, (branch) => branch.isDefault);
      }

      _.each(this.def.resolveBranches, (branch) => {
        branch.isActive = branch === matchingBranch;
      });

      // TODO: might be able to force a default to be defined?
      if (!matchingBranch) {
        throw new Error('no matching resolver branch found and no default');
      }
      resolutionResult = matchingBranch.resolver || undefined;

    // deal with normal case
    } else {
      // actually call the resolver
      try {
        resolutionResult = await this.def.resolve(ctx);
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

    // if the result of resolution was another resolver, now we need to call that one
    if (resolutionResult instanceof ConfigValueResolver) {
      // resolutionResult is now a child resolver which must be resolved itself
      // NOTE we have to call this recursively so that caching can be triggered on each resolver
      const childCtx = new ResolverContext(resolutionResult);
      await resolutionResult.resolve(childCtx);
      this.resolvedValue = resolutionResult.resolvedValue;
      // TODO: deal with errors - and need to bubble them up...?
    } else {
      // what if the result is undefined?
      this.resolvedValue = resolutionResult;
    }

    this.isResolved = true;

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
      createdByPluginInstanceName: this.def.createdByPlugin?.instanceName,
      // itemPath: this.configItem?.getFullPath(),
      // branchIdPath: this.branchIdPath,
      ...'resolveBranches' in this.def && {
        branches: _.map(this.def.resolveBranches, (b) => ({
          id: b.id,
          label: b.label,
          isDefault: b.isDefault,
          isActive: b.isActive,
          resolver: b.resolver.toJSON(),
        })),
      },
      resolvedValue: this.resolvedValue,
      resolutionError: this.resolutionError?.toJSON(),
    };
  }
}

export function processInlineResolverDef(resolverDef: InlineValueResolverDef) {
  // set up value resolver

  // inline function case
  if (_.isFunction(resolverDef)) {
    return createResolver({
      icon: 'f7:function',
      label: 'fn',
      resolve: resolverDef,
    });

  // already a resolver case
  } else if (resolverDef instanceof ConfigValueResolver) {
    return resolverDef;

  // static value case
  } else if (resolverDef !== undefined) {
    return createResolver({
      icon: 'material-symbols:check-circle',
      label: 'static',
      resolve: async () => resolverDef,
    });
  } else {
    throw new Error('invalid resolver definition');
  }
}

/**
 * helper fn to add caching to a value resolver that does not have it built-in
 * for example, a fn that generates a random number / key
 * */
export function cacheFunctionResult(resolverFn: ConfigValueInlineFunction): ConfigValueResolver;
export function cacheFunctionResult(cacheKey: string, resolverFn: ConfigValueInlineFunction): ConfigValueResolver;
export function cacheFunctionResult(
  cacheKeyOrResolverFn: string | ConfigValueInlineFunction,
  resolverFn?: ConfigValueInlineFunction,
): ConfigValueResolver {
  const explicitCacheKey = _.isString(cacheKeyOrResolverFn) ? cacheKeyOrResolverFn : undefined;
  const fn = _.isString(cacheKeyOrResolverFn) ? resolverFn! : cacheKeyOrResolverFn;

  return createResolver({
    icon: 'f7:function', // TODO: different fn for cached?
    label: 'cached fn',
    cacheKey: explicitCacheKey || ((ctx) => ctx.resolverFullPath),
    resolve: fn,
  });
}



// export class DeferredDeploymentResolver extends ConfigValueResolver {
//   icon = 'radix-icons:component-placeholder';
//   getPreviewLabel() {
//     return 'generated during deployment';
//   }
//   async _resolve(ctx: ResolverContext) {
//     return 'resolved by deployment process';
//   }
// }
// export const valueCreatedDuringDeployment = () => new DeferredDeploymentResolver();


export function createdPickedValueResolver(sourceItem: DmnoConfigItemBase, valueTransform?: ((val: any) => any)) {
  return createResolver({
    icon: 'material-symbols:content-copy-outline-sharp',
    label: 'picked value',
    async resolve(ctx) {
      // since we handle resolution of services in the right order
      // we can assume the picked value will be resolved already (if it was possible at all)
      if (!sourceItem.isResolved) {
        return new Error('picked value has not been resolved yet');
      }
      if (valueTransform) {
        return valueTransform(sourceItem.resolvedValue);
      } else {
        return sourceItem.resolvedValue;
      }
    },
  });
}

