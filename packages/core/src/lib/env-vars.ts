import _ from 'lodash-es';

export function getConfigFromEnvVars(separator = '__') {
  const config = {} as Record<string, any>;
  _.each(process.env, (val, key) => {
    const path = key.replaceAll(separator, '.');
    _.set(config, path, val);
  });
  return config;
}
