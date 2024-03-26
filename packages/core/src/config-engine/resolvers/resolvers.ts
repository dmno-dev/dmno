/* eslint-disable class-methods-use-this */
import _ from 'lodash-es';
import kleur from 'kleur';
import {
  DmnoConfigItemBase, ResolverContext,
} from '../config-engine';
import { ResolutionError } from '../errors';

// TODO: do we allow Date?
// what to do about null/undefined?
export type ConfigValue = string | number | boolean | null | { [key: string]: ConfigValue } | Array<ConfigValue>;
type ConfigValueInlineFunction = ((ctx: ResolverContext) => undefined | ConfigValue | ConfigValueResolver);
export type ValueResolverDef =
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

type ResolverBranch = {
  label: string;
  resolver: ConfigValueResolver;
  condition: (ctx: ResolverContext) => boolean;
  isDefault: boolean;
};
export abstract class ConfigValueResolver {
  abstract icon: string;
  abstract getPreviewLabel(): string;
  abstract _resolve(ctx: ResolverContext): Promise<undefined | ConfigValue | ConfigValueResolver>;

  cacheKey: string | undefined;

  childBranches?: Array<ResolverBranch>;

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

    // actually call the resolver
    let resolutionResult: Awaited<ReturnType<typeof this._resolve>>;
    try {
      resolutionResult = await this._resolve(ctx);
    } catch (err) {
      if (err instanceof ResolutionError) {
        this.resolutionError = err;
      } else {
        this.resolutionError = new ResolutionError(err as Error);
      }
      this.isResolved = false;
      return;
    }
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

/** Resolver used to wrap inline functions into a proper resolver */
export class FunctionResolver extends ConfigValueResolver {
  constructor(readonly fn: ConfigValueInlineFunction) {
    super();
  }
  icon = 'f7:function';
  getPreviewLabel() {
    return 'function!';
  }
  async _resolve(ctx: ResolverContext) {
    return await this.fn.call(this, ctx);
  }
}


// NOT SURE IF THIS IS NEEDED YET?
/** Resolver used to wrap static values resolver (already resolved) */
export class StaticValueResolver extends ConfigValueResolver {
  constructor(readonly value: ConfigValue) {
    super();
  }
  icon = 'material-symbols:check-circle';
  getPreviewLabel() {
    return 'function!';
  }
  async _resolve(_ctx: ResolverContext) {
    return this.value;
  }
}






export function processResolverDef(resolverDef: ValueResolverDef) {
  // set up value resolver
  if (_.isFunction(resolverDef)) {
    return new FunctionResolver(resolverDef);
  } else if (resolverDef instanceof ConfigValueResolver) {
    return resolverDef;
  } else if (resolverDef !== undefined) {
    return new StaticValueResolver(resolverDef);
  } else {
    throw new Error('invalid resolver definition');
  }
}

/**
 * helper fn to add caching to a value resolver that does not have it built-in
 * for example, a fn that generates a random number / key
 * */
export function cacheValue(key: string, resolverDef: ValueResolverDef) {
  // TODO: make this also work without an explicitly set key?
  // could either be 2 functions, or accept 1 or 2 args?
  const processedResolver = processResolverDef(resolverDef);
  processedResolver.cacheKey = key;

  return processedResolver;
}



export class DeferredDeploymentResolver extends ConfigValueResolver {
  icon = 'radix-icons:component-placeholder';
  getPreviewLabel() {
    return 'generated during deployment';
  }
  async _resolve(ctx: ResolverContext) {
    return 'resolved by deployment process';
  }
}
export const valueCreatedDuringDeployment = () => new DeferredDeploymentResolver();


export class PickedValueResolver extends ConfigValueResolver {
  /* eslint-disable class-methods-use-this */
  icon = 'material-symbols:content-copy-outline-sharp';
  getPreviewLabel() {
    return 'picked value';
  }

  constructor(private sourceItem: DmnoConfigItemBase, private valueTransform?: ((val: any) => any)) {
    super();
  }
  _resolve(_ctx: ResolverContext) {
    // since we handle resolution of services in the right order
    // we can assume the picked value will be resolved already (if it was possible at all)
    if (!this.sourceItem.isResolved) {
      return new Error('picked value has not been resolved yet');
    }
    if (this.valueTransform) {
      return this.valueTransform(this.sourceItem.resolvedValue);
    } else {
      return this.sourceItem.resolvedValue;
    }
  }
}

