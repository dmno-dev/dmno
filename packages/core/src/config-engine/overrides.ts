import _ from 'lodash-es';
import { loadServiceDotEnvFiles } from '../lib/dotenv-utils';
//! need to clean up overrrides
type NestedOverrideObj<T = string> = {
  [key: string]: NestedOverrideObj<T> | T;
};

export class OverrideSource {
  constructor(
    readonly type: string,
    readonly label: string | undefined,
    readonly icon: string,
    readonly values: NestedOverrideObj,
    readonly enabled = true,
  ) {}

  /** get an env var override value using a dot notation path */
  getOverrideForPath(path: string) {
    return _.get(this.values, path);
  }
}

type MaybePromise<T> = T | Promise<T>;
export type DmnoOverrideLoader = {
  load: (ctx: DmnoOverrideLoaderCtx) => MaybePromise<Array<OverrideSource>>
};

export type DmnoOverrideLoaderCtx = {
  serviceId: string,
  servicePath: string,
};


// ~ load overrides from process (`process.env`) ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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


export function processEnvOverrideLoader(): DmnoOverrideLoader {
  return {
    load() {
      // TODO: can cache this and return same source
      return [
        new OverrideSource('process', undefined, 'ri:terminal-box-fill', getConfigFromEnvVars()),
      ];
    },
  };
}


// ~ load overrides from dotenv files ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

export function dotEnvFileOverrideLoader(): DmnoOverrideLoader {
  return {
    async load(ctx: DmnoOverrideLoaderCtx) {
      // TODO: this is not at all optimized for speed...
      // particularly it is doing a check on if the file is gitignored
      // and if we are loading not in dev mode, we may just want to load files that will be applied
      const dotEnvFiles = await loadServiceDotEnvFiles(ctx.servicePath, { onlyLoadDmnoFolder: true });

      // TODO: support other formats (yaml, toml, json) - probably should all be through a plugin system

      // loads multiple override files, in order from more specific to least
      // .env.{ENV}.local
      // .env.local
      // .env.{ENV}
      // .env

      const dotenvOverrideSources = _.map(dotEnvFiles, (dotEnvFile) => {
        return new OverrideSource(
          '.env file',
          dotEnvFile.fileName,
          'simple-icons:dotenv',
          dotEnvFile.envObj,
          // TODO: specific env overrides are being enabled based on process.env.NODE_ENV
          // we probably want to be smarter about how _that_ gets resolved first
          // and store it at the workspace level or something...?
          !dotEnvFile.applyForEnv || dotEnvFile.applyForEnv === process.env.NODE_ENV,
        );
      });
      return dotenvOverrideSources;
    },
  };
}
