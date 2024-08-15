import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import _ from 'lodash-es';
import Debug from 'debug';
import validatePackageName from 'validate-npm-package-name';
import graphlib from '@dagrejs/graphlib';
import {
  decrypt, encrypt, generateDmnoEncryptionKeyString, generateEncryptionKeyString, importDmnoEncryptionKeyString,
} from '@dmno/encryption-lib';

import { parse as parseJSONC } from 'jsonc-parser';
import {
  DmnoBaseTypes, DmnoDataType, DmnoSimpleBaseTypeNames,
} from './base-types';
import {
  ConfigValue,
  InlineValueResolverDef, ConfigValueOverride, ConfigValueResolver, createdPickedValueResolver,
} from './resolvers/resolvers';
import { getConfigFromEnvVars } from '../lib/env-vars';
import { SerializedConfigItem, SerializedService, SerializedWorkspace } from '../config-loader/serialization-types';
import {
  CoercionError, ConfigLoadError, ResolutionError, SchemaError, ValidationError,
} from './errors';
import { DmnoPlugin } from './plugins';
import { stringifyJsonWithCommentBanner } from '../lib/json-utils';
import { loadDotEnvIntoObject, loadServiceDotEnvFiles } from '../lib/dotenv-utils';
import { asyncMapValues } from '../lib/async-utils';
import { RedactMode } from '../lib/redaction-helpers';

const debug = Debug('dmno');

type ConfigRequiredAtTypes = 'build' | 'boot' | 'run' | 'deploy';
export type CacheMode = 'skip' | 'clear' | true;

type ConfigContext = {
  get: (key: string) => any;
};
type ValueOrValueFromContextFn<T> = T | ((ctx: ConfigContext) => T);

// items (and types) can extend other types by either specifying
// - another type that was initialized - ex: `DmnoBaseTypes.string({ ... })`
// - another type that was not initialized - ex: `DmnoBaseTypes.string`
// - string label for a small subset of simple base types - ex: `'string'`
export type TypeExtendsDefinition<TypeSettings = any> =
  DmnoDataType |
  DmnoSimpleBaseTypeNames |
  (() => DmnoDataType) |
  ((opts: TypeSettings) => DmnoDataType);

export type TypeValidationResult = boolean | undefined | void | Error | Array<Error>;

/**
 * options for defining an individual config item
 * @category HelperMethods
 */

export type ExternalDocsEntry = {
  description?: string,
  url: string,
};

export type ConfigItemDefinition<ExtendsTypeSettings = any> = {
  /** short description of what this config item is for */
  summary?: string;
  /** longer description info including details, gotchas, etc... supports markdown  */
  description?: string;
  /** expose this item to be "pick"ed by other services, usually used for outputs of run/deploy */
  expose?: boolean;

  /** description of the data type itself, rather than the instance */
  typeDescription?: string;

  /** example value */
  exampleValue?: any;

  /** link to external documentation */
  externalDocs?: ExternalDocsEntry | Array<ExternalDocsEntry>;

  /** dmno config ui specific options */
  ui?: {
    /** icon to use, see https://icones.js.org/ for available options
    * @example mdi:aws
    */
    icon?: string;

    /** color (any valid css color)
    * @example FF0000
    */
    color?: string;
  };

  /** set if the item will be injected by a platform/framework */
  fromVendor?: string,

  /** whether this config is sensitive and must be kept secret */
  sensitive?: boolean | {
    /** customize redact/masking behaviour rules (defaults to `show_first_2`) */
    redactMode?: RedactMode,
    /** list of allowed domains this sensitive item is allowed be sent to */
    allowedDomains?: Array<string>
  }

  /** is this config item required, an error will be shown if empty */
  required?: boolean; // TODO: can this be a (ctx) => fn?

  /** at what time is this value required */
  useAt?: ConfigRequiredAtTypes | Array<ConfigRequiredAtTypes>;

  /** opt in/out of build-type code replacements - default is false unless changed at the service level */
  dynamic?: boolean;

  // we allow the fn that returns the data type so you can use the data type without calling the empty initializer
  // ie `DmnoBaseTypes.string` instead of `DmnoBaseTypes.string({})`;
  /** the type the item is based, can be a DmnoBaseType or something custom */
  extends?: TypeExtendsDefinition<ExtendsTypeSettings>;

  /** a validation function for the value, return true if valid, otherwise throw an error */
  validate?: ((val: any, ctx: ResolverContext) => TypeValidationResult);
  /** same as \`validate\` but async */
  asyncValidate?: ((val: any, ctx: ResolverContext) => Promise<TypeValidationResult>);
  /** a function to coerce values */
  coerce?: ((val: any, ctx: ResolverContext) => any);

  /** set the value, can be static, or a function, or use helpers */
  value?: InlineValueResolverDef;

  /** import value a env variable with a different name */
  importEnvKey?: string;
  /** export value as env variable with a different name */
  exportEnvKey?: string;
};

type PickConfigItemDefinition = {
  /** which service to pick from, defaults to "root" */
  source?: string;
  /** key(s) to pick, or function that matches against all keys from source */
  key: string | Array<string> | ((key: string) => boolean),

  /** new key name or function to rename key(s) */
  renameKey?: string | ((key: string) => string),

  /** function to transform value(s) */
  transformValue?: (value: any) => any,

  // TOOD: also allow setting the value (not transforming)
  // value?: use same value type as above
};

export type ConfigItemDefinitionOrShorthand = ConfigItemDefinition | TypeExtendsDefinition;


type DynamicConfigModes =
  /* non-sensitive = static, sensitive = dynamic (this is the default) */
  'public_static' |
  /* everything static, dynamic not supported */
  'only_static' |
  /* everything dynamic, static not supported */
  'only_dynamic' |
  /* default is static */
  'default_static' |
  /* default_dynamic */
  'default_dynamic';


type DmnoServiceSettings = {
  /** default behaviour for "dynamic" vs "static" behaviour of config items */
  dynamicConfig?: DynamicConfigModes,
  /** enable patching global logging methods to redact sensitive config (where possible) */
  redactSensitiveLogs?: boolean,
  /** enable patching http to intercept sending sensitive to config to non allowed domains (where possible) */
  interceptSensitiveLeakRequests?: boolean,
  /** enable scanning all code and data for leaks before sending to the client (where possible) */
  preventClientLeaks?: boolean,
};

/**
 * options for defining a service's config schema
 * @category HelperMethods
 */
export type DmnoServiceConfig = {
  /** set to true if this is the root service */
  isRoot?: boolean,
  /** service name - if empty, name from package.json will be used */
  name?: string,
  /** settings for this service - each item will be inherited from parent(s) if unspecified */
  settings?: DmnoServiceSettings,
  /** the config schema itself */
  schema: Record<string, ConfigItemDefinitionOrShorthand>,
} & ({
  isRoot: true
} | {
  isRoot?: false,
  /** name of parent service (if applicable) - if empty this service will be a child of the root service */
  parent?: string,
  /** optional array of "tags" for the service */
  tags?: Array<string>,
  /** array of config items to be picked from parent */
  pick?: Array<PickConfigItemDefinition | string>,
});

export type InjectedDmnoEnvItem = {
  value: any,
  dynamic?: boolean | 1 | '1',
  sensitive?: boolean | 1 | '1',
  redactMode?: RedactMode,
  allowedDomains?: Array<string>,
};
export type InjectedDmnoEnv = Record<string, InjectedDmnoEnvItem> & {
  $SETTINGS: DmnoServiceSettings,
};

export type SensitiveValueLookup = Record<string, {
  redacted: string,
  value: string,
  allowedDomains?: Array<string>,
}>;

export function defineDmnoService(opts: DmnoServiceConfig) {
  debug('LOADING SCHEMA!', opts);
  // we'll mark the object so we know it was initialized via defineDmnoService
  (opts as any)._isDmnoServiceConfig = true;
  return opts;
}

// config item keys are all checked against this regex
// currently it must start with a letter (to make it a valid js property)
// and can only contain letters, number, and underscore
// we may want to restrict "__" if we use that as the nesting separator for env var overrides?
const VALID_ITEM_KEY_REGEX = /^[a-z]\w+$/i;

export class ConfigPath {
  constructor(readonly path: string) { }
}
export const configPath = (path: string) => new ConfigPath(path);


type SerializedCacheEntry = {
  updatedAt: string,
  encryptedValue: string;
  usedByItems: Array<string>;
};
type SerializedCache = {
  version: string;
  keyName: string;
  items: Record<string, SerializedCacheEntry>;
};
type SerializedCacheKey = {
  version: string;
  key: string;
};
class CacheEntry {
  readonly usedByItems: Set<string>;
  readonly updatedAt: Date;
  readonly encryptedValue?: string;

  constructor(
    readonly key: string,
    readonly value: any,
    more?: {
      encryptedValue?: string,
      usedBy?: string | Array<string>,
      updatedAt?: Date,
    },
  ) {
    this.updatedAt = more?.updatedAt || new Date();
    this.usedByItems = new Set(_.castArray(more?.usedBy || []));
    // we store the value passed rather than recalculating so the cache file won't churn
    this.encryptedValue = more?.encryptedValue;
  }
  async getEncryptedValue() {
    return encrypt(CacheEntry.encryptionKey, this.value, CacheEntry.encryptionKeyName);
  }
  // have to make this async because of the encryption call
  async getJSON(): Promise<SerializedCacheEntry> {
    return {
      encryptedValue: this.encryptedValue || await this.getEncryptedValue(),
      updatedAt: this.updatedAt.toISOString(),
      usedByItems: Array.from(this.usedByItems),
    };
  }

  static async fromSerialized(itemKey: string, raw: SerializedCacheEntry) {
    // currently this setup means the encryptedValue changes on every run...
    // we could instead store the encryptedValue and reuse it if it has not changed
    const value = await decrypt(CacheEntry.encryptionKey, raw.encryptedValue, CacheEntry.encryptionKeyName);
    // we are also tossing out the saved "usedBy" entries since we'll have new ones after this config run
    return new CacheEntry(itemKey, value, {
      updatedAt: new Date(raw.updatedAt),
      encryptedValue: raw.encryptedValue,
    });
  }

  // not sure about this... but for now it seems true that we'll use a single key at a time
  static encryptionKey: crypto.webcrypto.CryptoKey;
  static encryptionKeyName: string;
}

type NestedOverrideObj<T = string> = {
  [key: string]: NestedOverrideObj<T> | T;
};

export class OverrideSource {
  constructor(
    readonly type: string,
    private values: NestedOverrideObj,
    readonly enabled = true,
  ) {}

  /** get an env var override value using a dot notation path */
  getOverrideForPath(path: string) {
    return _.get(this.values, path);
  }
}



export class DmnoWorkspace {
  private services: Record<string, DmnoService> = {};
  private servicesArray: Array<DmnoService> = [];
  private servicesByPackageName: Record<string, DmnoService> = {};

  private rootServiceName = 'root';
  get rootService() { return this.services[this.rootServiceName]; }
  get rootPath() { return this.rootService.path; }

  readonly processEnvOverrides = new OverrideSource('process.env', getConfigFromEnvVars());

  addService(service: DmnoService) {
    if (this.services[service.serviceName]) {
      // this should maybe be part of a workspace error rather than exploding?
      throw new Error(`Service names must be unique - duplicate name detected "${service.serviceName}"`);
    } else {
      this.services[service.serviceName] = service;
      this.servicesArray.push(service);
      this.servicesByPackageName[service.packageName] = service;
      if (service.isRoot) this.rootServiceName = service.serviceName;
    }
  }

  private servicesDag = new graphlib.Graph({ directed: true });
  initServicesDag() {
    // initialize a services DAG
    // note - we may want to experiment with "compound nodes" to have the services contain their config items as children?

    for (const service of this.servicesArray) {
      this.servicesDag.setNode(service.serviceName, { /* can add more metadata here */ });
    }

    // first set up graph edges based on "parent"
    for (const service of this.servicesArray) {
    // check if parent service is valid
      const parentServiceName = !service.rawConfig?.isRoot ? service.rawConfig?.parent : undefined;
      if (parentServiceName) {
        if (!this.services[parentServiceName]) {
          service.schemaErrors.push(new SchemaError(`Unable to find parent service "${parentServiceName}"`));
        } else if (parentServiceName === service.serviceName) {
          service.schemaErrors.push(new SchemaError('Cannot set parent to self'));
        } else {
        // creates a directed edge from parent to child
          this.servicesDag.setEdge(parentServiceName, service.serviceName, { type: 'parent' });
        }

        // anything without an explicit parent set is a child of the root
      } else if (!service.isRoot) {
        this.servicesDag.setEdge(this.rootServiceName, service.serviceName, { type: 'parent' });
      }
    }

    // add graph edges based on "pick"
    // we will not process individual items yet, but this will give us a DAG of service dependencies
    for (const service of this.servicesArray) {
      if (service.rawConfig?.isRoot) continue;
      // eslint-disable-next-line @typescript-eslint/no-loop-func
      _.each(service.rawConfig?.pick, (rawPick) => {
      // pick defaults to picking from "root" unless otherwise specified
        const pickFromServiceName = _.isString(rawPick)
          ? this.rootServiceName
          : (rawPick.source || this.rootServiceName);
        if (!this.services[pickFromServiceName]) {
          service.schemaErrors.push(new SchemaError(`Invalid service name in "pick" config - "${pickFromServiceName}"`));
        } else if (pickFromServiceName === service.serviceName) {
          service.schemaErrors.push(new SchemaError('Cannot "pick" from self'));
        } else {
        // create directed edge from service output feeding into this one (ex: database feeeds DB_URL into api )
          this.servicesDag.setEdge(pickFromServiceName, service.serviceName, { type: 'pick' });
        }
      });
    }

    // look for cycles in the services graph, add schema errors if present
    const graphCycles = graphlib.alg.findCycles(this.servicesDag);
    _.each(graphCycles, (cycleMemberNames) => {
    // each cycle is just an array of node names in the cycle
      _.each(cycleMemberNames, (name) => {
        this.services[name].schemaErrors.push(new SchemaError(`Detected service dependency cycle - ${cycleMemberNames.join(' + ')}`));
      });
    });

    // if no cycles were found in the services graph, we use a topological sort to get the right order to continue loading config
    if (!graphCycles.length) {
      const sortedServiceNames = graphlib.alg.topsort(this.servicesDag);
      // we'll sort the services array into dependency order
      this.servicesArray = _.map(sortedServiceNames, (serviceName) => this.services[serviceName]);
      debug('DEP SORTED SERVICES', sortedServiceNames);
    }
  }
  processConfig() {
    for (const service of this.servicesArray) {
      const ancestorServiceNames = this.servicesDag.predecessors(service.serviceName) || [];

      // process "picked" items
      if (!service.rawConfig?.isRoot) {
        for (const rawPickItem of service.rawConfig?.pick || []) {
          const pickFromServiceName = _.isString(rawPickItem)
            ? this.rootServiceName
            : (rawPickItem.source || this.rootServiceName);
          const isPickingFromAncestor = ancestorServiceNames.includes(pickFromServiceName);
          const rawPickKey = _.isString(rawPickItem) ? rawPickItem : rawPickItem.key;
          const pickFromService = this.services[pickFromServiceName];
          if (!pickFromService) {
          // NOTE: we've already added a schema error if item is picking from an non-existant service
          // while setting up the services DAG, so we can just bail on the item
            continue;
          }

          // first we'll gather a list of the possible keys we can pick from
          // when picking from an ancestor, we pick from all config items
          // while non-ancestors expose only items that have `expose: true` set on them
          const potentialKeysToPickFrom: Array<string> = [];

          if (isPickingFromAncestor) {
            potentialKeysToPickFrom.push(..._.keys(pickFromService.config));
          } else {
          // whereas only "exposed" items can be picked from non-ancestors
            const exposedItems = _.pickBy(pickFromService.config, (itemConfig) => !!itemConfig.type.expose);
            potentialKeysToPickFrom.push(..._.keys(exposedItems));
          }

          const keysToPick: Array<string> = [];

          // if key is a string or array of strings, we'll need to check they are valid
          if (_.isString(rawPickKey) || _.isArray(rawPickKey)) {
            for (const keyToCheck of _.castArray(rawPickKey)) {
              if (!potentialKeysToPickFrom.includes(keyToCheck)) {
              // TODO: we could include if the key exists but is not marked to "expose"?
                service.schemaErrors.push(new SchemaError(`Picked item ${pickFromServiceName} > ${keyToCheck} was not found`));
              } else {
                keysToPick.push(keyToCheck);
              }
            }

            // if it's a function, we'll be filtering from the list of potential items
          } else if (_.isFunction(rawPickKey)) { // fn that filters keys
            const pickKeysViaFilter = _.filter(potentialKeysToPickFrom, rawPickKey);

            // we probably want to warn the user if the filter selected nothing?
            if (!pickKeysViaFilter.length) {
            // TODO: we may want to mark this error as a "warning" or something?
            // or some other way of configuring / ignoring
              service.schemaErrors.push(new SchemaError(`Pick from ${pickFromServiceName} using key filter fn had no matches`));
            } else {
              keysToPick.push(...pickKeysViaFilter);
            // console.log('pick keys by filter', pickKeysViaFilter);
            }
          }

          for (let i = 0; i < keysToPick.length; i++) {
            const pickKey = keysToPick[i];
            // deal with key renaming
            let newKeyName = pickKey;
            if (!_.isString(rawPickItem) && rawPickItem.renameKey) {
            // renameKey can be a static string (if dealing with a single key)
              if (_.isString(rawPickItem.renameKey)) {
              // deal with the case of trying to rename multiple keys to a single value
              // TODO: might be able to discourage this in the TS typing?
                if (keysToPick.length > 1) {
                // add an error (once)
                  if (i === 0) {
                    service.schemaErrors.push(new SchemaError(`Picked multiple keys from ${pickFromServiceName} using static rename`));
                  }
                  // add an index suffix... so the items will at least still appear
                  newKeyName = `${rawPickItem.renameKey}-${i}`;
                } else {
                  newKeyName = rawPickItem.renameKey;
                }

                // or a function to transform the existing key
              } else {
                newKeyName = rawPickItem.renameKey(pickKey);
              }
            }

            service.addConfigItem(new DmnoPickedConfigItem(newKeyName, {
              sourceItem: pickFromService.config[pickKey],
              transformValue: _.isString(rawPickItem) ? undefined : rawPickItem.transformValue,
            }, service));
          // TODO: add to dag node with link to source item
          }
        }
      }

      // process the regular config schema items
      for (const itemKey in service.rawConfig?.schema) {
        if (!itemKey.match(VALID_ITEM_KEY_REGEX)) {
          service.schemaErrors.push(new SchemaError(`Invalid item key "${itemKey}"`));
        } else {
          const itemDef = service.rawConfig?.schema[itemKey];
          service.addConfigItem(new DmnoConfigItem(itemKey, itemDef, service));
        }

        // TODO: add dag node
      }
    }
  }
  async resolveConfig() {
    await this.loadCache();
    // servicesArray is already sorted by dependencies
    for (const service of this.servicesArray) {
      if (service.schemaErrors.length) {
        debug(`SERVICE ${service.serviceName} has schema errors: `);
        debug(service.schemaErrors);
      } else {
        await service.resolveConfig();
      }
    }
    await this.writeCache();
  }

  get allServices() {
    return this.servicesArray;
  }

  getService(descriptor: string | { serviceName?: string, packageName?: string }) {
    if (_.isString(descriptor)) {
      return this.services[descriptor];
    } else {
      if (descriptor.serviceName) return this.services[descriptor.serviceName];
      if (descriptor.packageName) return this.servicesByPackageName[descriptor.packageName];
    }
    throw new Error(`unable to find service - ${descriptor}`);
  }
  getServiceMetaForBuild(serviceName: string) {
    const service = this.services[serviceName];
    if (!service) throw new Error(`Unable to fine service - ${serviceName}`);
    return {
      requiredServices: this.servicesDag.predecessors(service.serviceName) || [],
    };
  }

  get cacheFilePath() { return `${this.rootPath}/.dmno/cache.json`; }
  get cacheKeyFilePath() { return `${this.rootPath}/.dmno/cache-key.json`; }
  private valueCache: Record<string, CacheEntry> = {};
  private cacheLastLoadedAt: Date | undefined;
  private cacheMode: CacheMode = true;
  setCacheMode(cacheMode: typeof this.cacheMode) {
    this.cacheMode = cacheMode;
  }
  private async loadCache() {
    if (this.cacheMode === 'skip') return;
    // might want to attach the CacheEntry to the workspace instead to get the key?
    // or we could always pass it around as needed

    // currently we are creating a cache key automatically if one does not exist
    // is that what we want to do? or have the user take more manual steps? not sure
    if (!fs.existsSync(this.cacheKeyFilePath)) {
      let keyName: string;
      try {
        const gitUserEmail = execSync('git config user.email').toString().trim();
        keyName = `${gitUserEmail}/${new Date().toISOString()}`;
      } catch (err) {}
      // when running in CI or elsewhere we wont have a git username so we fallback to something else
      keyName ||= `${process.env.NODE_ENV}/${new Date().toISOString()}`;
      const dmnoKeyStr = await generateDmnoEncryptionKeyString(keyName);

      const reimportedDmnoKey = await importDmnoEncryptionKeyString(dmnoKeyStr);
      if (reimportedDmnoKey.keyName !== keyName) throw new Error('reimported key name doesnt match');
      CacheEntry.encryptionKey = reimportedDmnoKey.key;
      CacheEntry.encryptionKeyName = keyName;

      const cacheKeyData: SerializedCacheKey = {
        version: '0.0.1',
        key: dmnoKeyStr,
      };
      await fs.promises.writeFile(this.cacheKeyFilePath, stringifyJsonWithCommentBanner(cacheKeyData));

      if (fs.existsSync(this.cacheFilePath)) {
        // destroy the cache file, since it will not match the new key...
        // should we confirm this with the user? probably doesn't matter?
        await fs.promises.unlink(this.cacheFilePath);
      }
    } else {
      const cacheKeyRawStr = await fs.promises.readFile(this.cacheKeyFilePath, 'utf-8');
      const cacheKeyRaw = parseJSONC(cacheKeyRawStr) as SerializedCacheKey;
      const importedDmnoKey = await importDmnoEncryptionKeyString(cacheKeyRaw.key);
      CacheEntry.encryptionKey = importedDmnoKey.key;
      CacheEntry.encryptionKeyName = importedDmnoKey.keyName;
    }

    if (this.cacheMode === 'clear') return;
    if (!fs.existsSync(this.cacheFilePath)) return;
    const cacheRawStr = await fs.promises.readFile(this.cacheFilePath, 'utf-8');
    const cacheRaw = parseJSONC(cacheRawStr) as SerializedCache;

    // check if the ID in the cache file matches the cache key
    if (CacheEntry.encryptionKeyName !== cacheRaw.keyName) {
      throw new Error('DMNO cache file does not match cache key');
    }

    for (const itemCacheKey in cacheRaw.items) {
      this.valueCache[itemCacheKey] = await CacheEntry.fromSerialized(itemCacheKey, cacheRaw.items[itemCacheKey]);
    }
    this.cacheLastLoadedAt = new Date();
  }
  private async writeCache() {
    if (this.cacheMode === 'skip') return;
    // we don't want to write a file if the cache has not changed because it will trigger vite to reload
    if (this.cacheLastLoadedAt && _.every(this.valueCache, (item) => item.updatedAt < this.cacheLastLoadedAt!)) {
      return;
    }

    const serializedCache: SerializedCache = {
      version: '0.0.1',
      keyName: CacheEntry.encryptionKeyName,
      items: await asyncMapValues(this.valueCache, async (cacheItem) => cacheItem.getJSON()),
    };
    const serializedCacheStr = stringifyJsonWithCommentBanner(serializedCache);
    await fs.promises.writeFile(this.cacheFilePath, serializedCacheStr, 'utf-8');
  }
  async getCacheItem(key: string, usedBy?: string) {
    debug('get cache item', key);
    if (this.cacheMode === 'skip') return undefined;
    if (key in this.valueCache) {
      if (usedBy) this.valueCache[key].usedByItems.add(usedBy);
      return this.valueCache[key].value;
    }
  }
  async setCacheItem(key: string, value: string, usedBy?: string) {
    if (this.cacheMode === 'skip') return undefined;
    this.valueCache[key] = new CacheEntry(key, value, { usedBy });
  }

  plugins: Record<string, DmnoPlugin> = {};

  toJSON(): SerializedWorkspace {
    return {
      plugins: _.mapValues(this.plugins, (p) => p.toJSON()),
      services: _.mapValues(
        _.keyBy(this.services, (s) => s.serviceName),
        (s) => s.toJSON(),
      ),
    };
  }
}


export class DmnoService {
  /** name of service according to package.json file  */
  readonly packageName: string;
  /** name of service within dmno - pulled from config.ts but defaults to packageName if not provided  */
  readonly serviceName: string;
  /** true if service is root */
  readonly isRoot: boolean;
  /** path to the service itself */
  readonly path: string;
  /** unprocessed config schema pulled from config.ts */
  readonly rawConfig?: DmnoServiceConfig;
  /** error encountered while _loading_ the config schema */
  readonly configLoadError?: ConfigLoadError;
  /** error within the schema itself */
  readonly schemaErrors: Array<SchemaError> = []; // TODO: probably want a specific error type...?

  /** processed config items - not necessarily resolved yet */
  readonly config: Record<string, DmnoConfigItem | DmnoPickedConfigItem> = {};

  readonly workspace: DmnoWorkspace;

  injectedPlugins: Array<DmnoPlugin> = [];
  ownedPlugins: Array<DmnoPlugin> = [];

  private overrideSources = [] as Array<OverrideSource>;

  constructor(opts: {
    packageName: string,
    path: string,
    workspace: DmnoWorkspace,
    isRoot: boolean,
    rawConfig: DmnoServiceConfig | ConfigLoadError
  }) {
    this.workspace = opts.workspace;
    this.isRoot = opts.isRoot;
    this.packageName = opts.packageName;
    this.path = opts.path;

    if (_.isError(opts.rawConfig)) {
      this.serviceName = this.packageName;
      this.configLoadError = opts.rawConfig;
    } else {
      // service name questions here:
      // - default root to "root" instead of package name?
      // - disallow renaming the root service?
      // - stop naming a non-root service "root"?
      this.rawConfig = opts.rawConfig;

      if (this.rawConfig.name) {
        const validateNameResult = validatePackageName(this.rawConfig.name);
        if (!validateNameResult.validForNewPackages) {
          const nameErrors = _.concat([], validateNameResult.warnings, validateNameResult.errors);
          this.schemaErrors.push(new SchemaError(`Invalid service name "${this.rawConfig.name}" - ${nameErrors.join(', ')}`));
        }
        this.serviceName = this.rawConfig.name;
      } else {
        this.serviceName = opts.isRoot ? 'root' : this.packageName;
      }
    }
  }

  get parentService(): DmnoService | undefined {
    if (this.rawConfig?.isRoot) return;
    if (this.rawConfig?.parent) {
      const parent = this.workspace.getService({ serviceName: this.rawConfig?.parent });
      if (parent) return parent;
      throw new Error(`Unable to find parent service: ${this.rawConfig.parent}`);
    }
    return this.workspace.rootService;
  }

  /**
   * helper to get applied value of service setting
   * this walks up the chain of ancestors until a value is found
   * */
  private getSettingsItem<K extends keyof DmnoServiceSettings>(key: K): DmnoServiceSettings[K] | undefined {
    if (this.rawConfig?.settings && key in this.rawConfig.settings) {
      return this.rawConfig.settings[key];
    }
    return this.parentService?.getSettingsItem(key);
  }

  addConfigItem(item: DmnoConfigItem | DmnoPickedConfigItem) {
    if (item instanceof DmnoPickedConfigItem && this.rawConfig?.schema[item.key]) {
      // check if a picked item is conflicting with a regular item
      this.schemaErrors.push(new SchemaError(`Picked config key conflicting with a locally defined item - "${item.key}"`));
    } else if (this.config[item.key]) {
      // TODO: not sure if we want to add the item anyway under a different key?
      // probably want to expose more info too
      this.schemaErrors.push(new SchemaError(`Config keys must be unique, duplicate detected - "${item.key}"`));
    } else {
      this.config[item.key] = item;
    }
  }

  async loadOverrideFiles() {
    this.overrideSources = [];

    // TODO: this is not at all optimized for speed...
    // particularly it is doing a check on if the file is gitignored
    // and if we are loading not in dev mode, we may just want to load files that will be applied
    const dotEnvFiles = await loadServiceDotEnvFiles(this.path, { onlyLoadDmnoFolder: true });

    dotEnvFiles.forEach((dotEnvFile) => {
      this.overrideSources.unshift(
        new OverrideSource(
          dotEnvFile.fileName,
          dotEnvFile.envObj,
          // TODO: specific env overrides are being enabled based on process.env.NODE_ENV
          // we probably want to be smarter about how _that_ gets resolved first
          // and store it at the workspace level or something...?
          !dotEnvFile.applyForEnv || dotEnvFile.applyForEnv === process.env.NODE_ENV,
        ),
      );
    });

    // load multiple override files
    // .env.{ENV}.local
    // .env.local
    // .env.{ENV}
    // .env

    // TODO: support other formats (yaml, toml, json) - probably should all be through a plugin system
  }

  async resolveConfig() {
    await this.loadOverrideFiles();

    for (const itemKey in this.config) {
      const configItem = this.config[itemKey];
      const itemPath = configItem.getPath(true);



      // reset overrides
      configItem.overrides = [];
      // set override from environment (process.env)
      _.each([
        // process.env overrides exist at the workspace root
        this.workspace.processEnvOverrides,
        // other override sources - (just env files for now)
        ...this.overrideSources.filter((o) => o.enabled),
      ], (overrideSource) => {
        const overrideVal = overrideSource.getOverrideForPath(itemPath);
        if (overrideVal !== undefined) {
          // TODO: deal with nested items

          configItem.overrides.push({
            source: overrideSource.type,
            value: overrideVal,
          });
        }
      });

      // currently this resolve fn will trigger resolve on nested items
      await configItem.resolve();

      // notify all plugins about the resolved item in case it resolves an input
      if (configItem.isResolved) {
        for (const plugin of this.ownedPlugins) {
          // const plugin = this.workspace.plugins[pluginKey];
          plugin.attemptInputResolutionsUsingConfigItem(configItem);
        }
      }
    }

    // final check on all plugins
    for (const plugin of this.ownedPlugins) {
      // const plugin = this.workspace.plugins[pluginKey];
      plugin.checkItemsResolutions();
    }
  }

  getConfigItemByPath(path: string) {
    const pathParts = path.split('.');
    let currentItem: DmnoConfigItemBase = this.config[pathParts[0]];
    for (let i = 1; i < pathParts.length; i++) {
      const pathPart = pathParts[i];
      if (_.has(currentItem.children, pathPart)) {
        currentItem = currentItem.children[pathPart];
      } else {
        throw new Error(`Trying to access ${this.serviceName} / ${path} failed at ${pathPart}`);
      }
    }
    return currentItem;
  }

  get isSchemaValid() {
    if (this.configLoadError) return false;
    if (this.schemaErrors?.length) return false;
    if (!_.every(_.values(this.config), (configItem) => configItem.isSchemaValid)) return false;
    return true;
  }

  get isValid() {
    if (!this.isSchemaValid) return false;
    if (!_.every(_.values(this.config), (configItem) => configItem.isValid)) return false;
    return true;
  }

  getEnv() {
    const env: Record<string, any> = _.mapValues(this.config, (item) => {
      return item.resolvedValue;
    });
    return env;
  }
  getInjectedEnvJSON(): InjectedDmnoEnv {
    // some funky ts stuff going on here... doesn't like how I set the values,
    // but otherwise the type seems to work ok?
    const env: any = _.mapValues(this.config, (item) => item.toInjectedJSON());
    // simple way to get settings passed through to injected stuff - we may want
    env.$SETTINGS = this.settings;
    return env as any;
  }

  get settings(): DmnoServiceSettings {
    // TODO: we should probably cache this instead of recalculating on each access?
    return {
      dynamicConfig: this.getSettingsItem('dynamicConfig'),
      preventClientLeaks: this.getSettingsItem('preventClientLeaks'),
      redactSensitiveLogs: this.getSettingsItem('redactSensitiveLogs'),
      interceptSensitiveLeakRequests: this.getSettingsItem('interceptSensitiveLeakRequests'),
    };
  }

  toJSON(): SerializedService {
    return {
      isSchemaValid: this.isSchemaValid,
      isValid: this.isValid,
      isResolved: true,
      packageName: this.packageName,
      serviceName: this.serviceName,
      path: this.path,
      configLoadError: this.configLoadError?.toJSON(),
      schemaErrors:
        this.schemaErrors?.length
          ? _.map(this.schemaErrors, (err) => err.toJSON())
          : undefined,

      ownedPluginNames: _.map(this.ownedPlugins, (p) => p.instanceName),
      injectedPluginNames: _.map(this.injectedPlugins, (p) => p.instanceName),

      settings: this.settings,
      config: _.mapValues(this.config, (item, _key) => item.toJSON()),
      injectedEnv: this.getInjectedEnvJSON(),
    };
  }
}

export class ResolverContext {
  // TODO: the item has everything we need, but is it what we want to pass in?
  // lots of ? and ! on ts types here because data doesn't exist at init time...
  private resolver?: ConfigValueResolver;
  private configItem: DmnoConfigItemBase;
  constructor(
    // private configItem: DmnoConfigItemBase,
    resolverOrItem: ConfigValueResolver | DmnoConfigItemBase,
  ) {
    if (resolverOrItem instanceof ConfigValueResolver) {
      this.resolver = resolverOrItem;
      this.configItem = this.resolver.configItem!;
    } else {
      this.configItem = resolverOrItem;
    }
  }

  get service() {
    return this.configItem.parentService;
  }
  get serviceName() {
    return this.service?.serviceName;
  }
  get itemPath() {
    return this.configItem.getPath();
  }
  get itemFullPath() {
    return this.configItem.getFullPath();
  }
  get resolverFullPath() {
    return this.resolver ? this.resolver.getFullPath() : this.itemFullPath;
  }
  get resolverBranchIdPath() {
    return this.resolver?.branchIdPath;
  }

  get(itemPath: string) {
    const item = this.service?.getConfigItemByPath(itemPath);
    if (!item) {
      throw new Error(`Tried to get item that does not exist ${itemPath}`);
    }
    if (!item.isResolved) {
      throw new Error(`Tried to access item that was not resolved - ${item.getPath()}`);
    }
    return item.resolvedValue;
  }


  // TODO: probably dont want to pull cache disable setting from the workspace/service/etc
  async getCacheItem(key: string) {
    if (process.env.DISABLE_DMNO_CACHE) return undefined;
    return this.service?.workspace.getCacheItem(key, this.itemFullPath);
  }
  async setCacheItem(key: string, value: ConfigValue) {
    if (process.env.DISABLE_DMNO_CACHE) return;
    if (value === undefined || value === null) return;
    return this.service?.workspace.setCacheItem(key, value.toString(), this.itemFullPath);
  }
  async getOrSetCacheItem(key: string, getValToWrite: () => Promise<string>) {
    if (!process.env.DISABLE_DMNO_CACHE) {
      const cachedValue = await this.getCacheItem(key);
      if (cachedValue) return cachedValue;
    }
    const val = await getValToWrite();
    if (!process.env.DISABLE_DMNO_CACHE) {
      await this.setCacheItem(key, val);
    }
    return val;
  }
}


export abstract class DmnoConfigItemBase {
  constructor(
    /** the item key / name */
    readonly key: string,
    private parent?: DmnoService | DmnoConfigItemBase,
  ) {}

  overrides: Array<ConfigValueOverride> = [];

  valueResolver?: ConfigValueResolver;

  isResolved = false;

  get resolvedRawValue(): ConfigValue | undefined {
    if (this.overrides.length) {
      return this.overrides[0].value;
    }
    return this.valueResolver?.resolvedValue;
  }

  /** error encountered during resolution */
  get resolutionError(): ResolutionError | undefined {
    return this.valueResolver?.resolutionError;
  }

  /** resolved value _after_ coercion logic applied */
  resolvedValue?: ConfigValue;

  // not sure if the coercion error should be stored in resolution error or split?
  /** error encountered during coercion step */
  coercionError?: CoercionError;

  /** more details about the validation failure if applicable */
  validationErrors?: Array<ValidationError>;

  get schemaErrors() {
    return this.type.schemaErrors;
  }

  /** whether the schema itself is valid or not */
  get isSchemaValid(): boolean | undefined {
    if (this.schemaErrors?.length) return false;
    return true;
  }

  /** whether the final resolved value is valid or not */
  get isValid(): boolean | undefined {
    if (!this.isSchemaValid) return false;
    if (this.coercionError) return false;
    if (this.validationErrors && this.validationErrors?.length > 0) return false;
    if (this.resolutionError) return false;
    return true;
  }

  abstract get type(): DmnoDataType;

  children: Record<string, DmnoConfigItemBase> = {};

  get parentService(): DmnoService | undefined {
    if (this.parent instanceof DmnoService) {
      return this.parent;
    } else if (this.parent instanceof DmnoConfigItemBase) {
      return this.parent.parentService;
    }
  }

  getPath(respectImportOverride = false): string {
    const itemKey = (respectImportOverride && this.type.importEnvKey) || this.key;
    if (this.parent instanceof DmnoConfigItemBase) {
      const parentPath = this.parent.getPath(respectImportOverride);
      return `${parentPath}.${itemKey}`;
    }
    return itemKey;
  }
  getFullPath(respectImportOverride = false): string {
    if (!this.parentService?.serviceName) {
      throw new Error('unable to get full path - this item is not attached to a service');
    }
    return `${this.parentService.serviceName}!${this.getPath(respectImportOverride)}`;
  }
  get isSensitive() {
    // will likely add some more service-level defaults/settings
    return !!this.type.sensitive;
  }

  get isDynamic() {
    // this resolves whether the item should actually be treated as static or dynamic
    // which takes into account the specific item's `dynamic` override
    // the parent's dynamicConfig setting and if the item is "sensitive" (if the servies is in `public_static` mode)

    // NOTE - this is the only place this logic exists

    // get the config default mode of the service
    const serviceDynamicConfigMode = this.parentService?.settings.dynamicConfig;

    if (serviceDynamicConfigMode === 'only_dynamic') return true;
    if (serviceDynamicConfigMode === 'only_static') return false;

    const explicitSetting = this.type.dynamic;
    if (explicitSetting !== undefined) return explicitSetting;

    if (serviceDynamicConfigMode === 'default_dynamic') return true;
    if (serviceDynamicConfigMode === 'default_static') return false;

    // 'public_static' mode is default behaviour
    // sensitive = dynamic, non-sensitive = static
    return !!this.isSensitive;
  }


  async resolve() {
    // TODO: not sure if we want to bail here or what it means to be "resolved" as things are changing?
    if (this.isResolved) return;

    const itemResolverCtx = new ResolverContext(this.valueResolver || this);

    // resolve children of objects... this will need to be thought through and adjusted

    // TODO: re-enable children / objects

    // for (const childKey in this.children) {
    //   // note - this isn't right, each resolve will probably need a new context object?
    //   // an we'll need to deal with merging values set by the parent with values set in the child
    //   await this.children[childKey].resolve(ctx);
    // }

    // console.log(`> resolving ${this.parentService?.serviceName}/${this.key}`);
    if (this.valueResolver) {
      await this.valueResolver.resolve(itemResolverCtx);
    }

    this.isResolved = true;

    // TODO: need to think through if we want to run coercion/validation at all when we've encountered
    // errors in the previous steps

    // apply coercion logic (for example - parse strings into numbers)
    // NOTE - currently we trigger this if the resolved value was not undefined
    // but we may want to coerce undefined values in some cases as well?
    // need to think through errors + overrides + empty values...
    if (this.resolvedRawValue !== undefined) {
      try {
        const coerceResult = this.type.coerce(_.cloneDeep(this.resolvedRawValue), itemResolverCtx);
        if (coerceResult instanceof CoercionError) {
          this.coercionError = coerceResult;
        } else {
          this.resolvedValue = coerceResult;
        }
      } catch (err) {
        this.coercionError = new CoercionError(err as Error);
      }
    }

    // run validation logic
    const validationResult = this.type.validate(_.cloneDeep(this.resolvedValue), itemResolverCtx);
    this.validationErrors = validationResult === true ? [] : validationResult;

    debug(
      `${this.parentService?.serviceName}/${this.getPath()} = `,
      JSON.stringify(this.resolvedRawValue),
      JSON.stringify(this.resolvedValue),
      this.isValid ? '✅' : `❌ ${this.validationErrors?.[0]?.message}`,
    );
  }

  /** this is the shape that gets injected into an serialized json env var by `dmno run` */
  toInjectedJSON(): InjectedDmnoEnvItem {
    return {
      ...this.isSensitive && { sensitive: 1 },
      // adds `redactMode` and `allowedDomains`
      ..._.isObject(this.type.sensitive) && this.type.sensitive,
      ...this.isDynamic && { dynamic: 1 },
      value: this.resolvedValue,
    };
  }

  toJSON(): SerializedConfigItem {
    return {
      key: this.key,
      isSchemaValid: this.isSchemaValid,
      isValid: this.isValid,
      dataType: this.type.toJSON(),
      isDynamic: this.isDynamic,

      resolvedRawValue: this.resolvedRawValue,
      resolvedValue: this.resolvedValue,
      isResolved: this.isResolved,
      children: _.mapValues(this.children, (c) => c.toJSON()),

      resolver: this.valueResolver?.toJSON(),
      overrides: this.overrides,

      schemaErrors: this.schemaErrors?.length
        ? _.map(this.schemaErrors, (err) => err.toJSON())
        : undefined,
      coercionError: this.coercionError?.toJSON(),

      validationErrors:
        this.validationErrors?.length
          ? _.map(this.validationErrors, (err) => err.toJSON())
          : undefined,

      resolutionError: this.resolutionError?.toJSON(),
    };
  }
}



// this is a "processed" config item
export class DmnoConfigItem extends DmnoConfigItemBase {
  readonly type: DmnoDataType;
  readonly schemaError?: Error;

  constructor(
    key: string,
    defOrShorthand: ConfigItemDefinitionOrShorthand,
    parent?: DmnoService | DmnoConfigItem,
  ) {
    super(key, parent);


    // TODO: DRY this up -- it's (mostly) the same logic that DmnoDataType uses when handling extends
    if (_.isString(defOrShorthand)) {
      if (!DmnoBaseTypes[defOrShorthand]) {
        throw new Error(`found invalid parent (string) in extends chain - "${defOrShorthand}"`);
      } else {
        this.type = DmnoBaseTypes[defOrShorthand]({});
      }
    } else if (_.isFunction(defOrShorthand)) {
      // in this case, we have no settings to pass through, so we pass an empty object
      const shorthandFnResult = defOrShorthand({});
      if (!(shorthandFnResult instanceof DmnoDataType)) {
        // TODO: put this in schema error instead?
        console.log(DmnoDataType, shorthandFnResult);
        throw new Error('invalid schema as result of fn shorthand');
      } else {
        this.type = shorthandFnResult;
      }
    } else if (defOrShorthand instanceof DmnoDataType) {
      this.type = defOrShorthand;
    } else if (_.isObject(defOrShorthand)) {
      // this is the only real difference b/w the handling of extends...
      // we create a DmnoDataType directly without a reusable type for the items defined in the schema directly
      this.type = new DmnoDataType(defOrShorthand as any, undefined, undefined);
    } else {
      // TODO: put this in schema error instead?
      throw new Error('invalid item schema');
    }

    try {
      this.initializeChildren();
    } catch (err) {
      this.schemaError = err as Error;
      debug(err);
    }

    this.valueResolver = this.type.valueResolver;
    if (this.valueResolver) this.valueResolver.configItem = this;
  }

  private initializeChildren() {
    // special handling for object types to initialize children
    if (this.type.primitiveTypeFactory === DmnoBaseTypes.object) {
      _.each(this.type.primitiveType.typeInstanceOptions, (childDef, childKey) => {
        this.children[childKey] = new DmnoConfigItem(childKey, childDef, this);
      });
    }
    // TODO: also need to initialize the `itemType` for array and dictionary
    // unless we change how those work altogether...
  }
}

// TODO: we could merge this with the above and handle both cases? we'll see

export class DmnoPickedConfigItem extends DmnoConfigItemBase {
  /** full chain of items up to the actual config item */
  private pickChain: Array<DmnoConfigItemBase> = [];

  constructor(
    key: string,
    private def: {
      sourceItem: DmnoConfigItemBase,
      transformValue?: (val: any) => any,
    },
    parent?: DmnoService | DmnoPickedConfigItem,
  ) {
    super(key, parent);

    // we'll follow through the chain of picked items until we get to a real config item
    // note we're storing them in the opposite order as the typechain above
    // because we'll want to traverse them in this order to do value transformations
    this.pickChain.unshift(this.def.sourceItem);
    while (this.pickChain[0] instanceof DmnoPickedConfigItem) {
      this.pickChain.unshift(this.pickChain[0].def.sourceItem);
    }

    this.initializeChildren();

    // each item in the chain could have a value transformer, so we must follow the entire chain
    this.valueResolver = createdPickedValueResolver(this.def.sourceItem, this.def.transformValue);
    this.valueResolver.configItem = this;
  }

  /** the real source config item - which defines most of the settings */
  get originalConfigItem() {
    // we know the first item in the list will be the actual source (and a DmnoConfigItem)
    return this.pickChain[0] as DmnoConfigItem;
  }
  get type() {
    return this.originalConfigItem.type;
  }

  private initializeChildren() {
    if (this.originalConfigItem.children) {
      _.each(this.originalConfigItem.children, (sourceChild, childKey) => {
        this.children[childKey] = new DmnoPickedConfigItem(sourceChild.key, { sourceItem: sourceChild }, this);
      });
    }
  }
}
