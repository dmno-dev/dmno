import _ from 'lodash-es';

/**
 * parse env vars into an object, using a special separator to denote nesting.
 * This idea comes from https://www.npmjs.com/package/nconf
 *
 * for example PARENT_ITEM__CHILD_ITEM=foo would result in
 * { PARENT_ITEM: { CHILD_ITEM: "foo" } }
 */
export function getConfigFromEnvVars(
  /** separator to interpret as nesting, defaults to "__" */
  separator = '__',
) {
  const config = {} as Record<string, any>;
  _.each(process.env, (val, key) => {
    const path = key.replaceAll(separator, '.');
    // _.set deals with initializing objects when necessary
    _.set(config, path, val);
  });
  return config;
}
