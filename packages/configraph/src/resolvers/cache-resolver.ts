import * as _ from 'lodash-es';
import {
  ConfigValueInlineFunction,
  ConfigValueResolver,
  createResolver,
} from '../resolvers';


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

