/* eslint-disable class-methods-use-this */
import _ from 'lodash-es';
import {
  DmnoConfigItemBase, ResolverContext,
} from '../config-engine';
import { ResolutionError } from '../errors';

// TODO: do we allow Date?
// what to do about null/undefined?
export type ConfigValue = string | number | boolean | null | { [key: string]: ConfigValue } | Array<ConfigValue>;

type ValueResolverResult = undefined | ConfigValue | ConfigValueResolver;
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
  icon?: ValueOrValueGetter<string>,
  label: ValueOrValueGetter<string>,
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
  label: string;
  resolver: ConfigValueResolver;
  condition: (ctx: ResolverContext) => boolean;
  isDefault: boolean;
};

export class ConfigValueResolver {
  constructor(readonly def: ResolverDefinition) {}

  cacheKey: string | undefined;

  isResolved = false;
  resolvedValue?: ConfigValue;
  isUsingCache = false;

  resolutionError?: ResolutionError;

  async resolve(ctx: ResolverContext) {
    // if a cache key is set, we first check the cache and return that value if found
    if (this.cacheKey) {
      // console.log(kleur.bgMagenta(`CHECK VALUE CACHE FOR KEY: ${this.cacheKey}`));
      const cachedValue = await ctx.getCacheItem(this.cacheKey);
      if (cachedValue !== undefined) {
        // console.log(kleur.bgMagenta('> USING CACHED VALUE!'));
        this.resolvedValue = cachedValue;
        this.isResolved = true;
        this.isUsingCache = true;
        return;
      }
    }

    let resolutionResult: ValueResolverResult;

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
      await resolutionResult.resolve(ctx);
      this.resolvedValue = resolutionResult.resolvedValue;
      // TODO: deal with errors - and need to bubble them up...?
    } else {
      // what if the result is undefined?
      this.resolvedValue = resolutionResult;
    }

    this.isResolved = true;

    // save result in cache if this resolver has a cache key
    if (this.cacheKey && this.resolvedValue !== undefined && this.resolvedValue !== null) {
      // console.log(kleur.bgMagenta(`SAVE CACHED VALUE IN KEY: ${this.cacheKey}`));
      await ctx.setCacheItem(this.cacheKey, this.resolvedValue);
    }
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
export function cacheValue(key: string, resolverDef: InlineValueResolverDef) {
  // TODO: make this also work without an explicitly set key?
  // could either be 2 functions, or accept 1 or 2 args?
  const processedResolver = processInlineResolverDef(resolverDef);
  processedResolver.cacheKey = key;

  return processedResolver;
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

