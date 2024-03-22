import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import _ from 'lodash-es';
import Debug from 'debug';

import dotenv from 'dotenv';

import validatePackageName from 'validate-npm-package-name';
import graphlib from '@dagrejs/graphlib';

import {
  DmnoBaseTypes, DmnoDataType, DmnoSimpleBaseTypeNames,
} from './base-types';
import {
  ConfigValue,
  ValueResolverDef, ConfigValueOverride, ConfigValueResolver, PickedValueResolver,
} from './resolvers/resolvers';
import { getConfigFromEnvVars } from '../lib/env-vars';
import { SerializedConfigItem, SerializedService } from '../config-loader/serialization-types';
import {
  CoercionError, ConfigLoadError, DmnoError, SchemaError, ValidationError,
} from './errors';
import { decrypt, encrypt } from '../lib/encryption';
import { ClassOf, DmnoPlugin } from './plugins';



const ENCRYPTION_KEY = 'MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDE=';

const debug = Debug('dmno');

type ConfigRequiredAtTypes = 'build' | 'boot' | 'run' | 'deploy';

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
  example?: any;

  /** link to external documentation */
  externalDocs?: {
    description?: string,
    url: string,
  };

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

  /** whether this config is sensitive and must be kept secret */
  secret?: ValueOrValueFromContextFn<boolean>;

  /** is this config item required, an error will be shown if empty */
  required?: ValueOrValueFromContextFn<boolean>;

  /** at what time is this value required */
  useAt?: ConfigRequiredAtTypes | Array<ConfigRequiredAtTypes>;

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
  // value?: ValueOrValueFromContextFn<any>
  value?: ValueResolverDef;

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

type ConfigItemDefinitionOrShorthand = ConfigItemDefinition | TypeExtendsDefinition;

/**
 * options for defining a service's config schema
 * @category HelperMethods
 */

export type WorkspaceConfig = {
  /**
   * root property that holds all the of schema items
   */
  schema: Record<string, ConfigItemDefinitionOrShorthand>,
};

/**
 * options for defining a service's config schema
 * @category HelperMethods
 */

export type ServiceConfigSchema = {
  /** service name - if empty, name from package.json will be used */
  name?: string,
  /** name of parent service (if applicable) - if empty this service will be a child of the root service */
  parent?: string,
  /** optional array of "tags" for the service */
  tags?: Array<string>,
  /** array of config items to be picked from parent */
  pick?: Array<PickConfigItemDefinition | string>,
  /** the config schema itself */
  schema: Record<string, ConfigItemDefinitionOrShorthand>,
};

export function defineConfigSchema(opts: ServiceConfigSchema) {
  debug('LOADING SCHEMA!', opts);
  // TODO: return initialized object
  return opts;
}

export function defineWorkspaceConfig(opts: WorkspaceConfig) {
  debug('LOADING ROOT SCHEMA!', opts);
  return opts;
}




export class ConfigPath {
  constructor(readonly path: string) { }
}
export const configPath = (path: string) => new ConfigPath(path);


type ValueCacheEntry = {
  /** ISO timestamp of when this cache entry was last updated */
  updatedAt: string;
  /** encrypted value */
  encryptedVal: string;
  /** decrypted value */
  val?: string;
  /** array of full item paths where this item was used */
  usedBy: Set<string>;
};


type SerializedCacheEntry = {
  updatedAt: string,
  encryptedValue: string;
  usedByItems: Array<string>;
};
type SerializedCache = {
  version: string;
  items: Record<string, SerializedCacheEntry>;
};
class CacheEntry {
  readonly usedByItems: Set<string>;
  readonly updatedAt: Date;
  readonly encryptedValue: string;

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
    this.encryptedValue = more?.encryptedValue || this.getEncryptedValue();
  }
  getEncryptedValue() {
    return encrypt(CacheEntry.encryptionKey, this.value);
  }
  toJSON(): SerializedCacheEntry {
    return {
      encryptedValue: this.encryptedValue,
      updatedAt: this.updatedAt.toISOString(),
      usedByItems: Array.from(this.usedByItems),
    };
  }

  static async fromSerialized(itemKey: string, raw: SerializedCacheEntry) {
    // currently this setup means the encryptedValue changes on every run...
    // we could instead store the encryptedValue and reuse it if it has not changed
    const value = await decrypt(CacheEntry.encryptionKey, raw.encryptedValue);
    // we are also tossing out the saved "usedBy" entries since we'll have new ones after this config run
    return new CacheEntry(itemKey, value, {
      updatedAt: new Date(raw.updatedAt),
      encryptedValue: raw.encryptedValue,
    });
  }

  // not sure about this... but for now it seems true that we'll use a single key at a time
  static encryptionKey: string;
}

type NestedOverrideObj<T = string> = {
  [key: string]: NestedOverrideObj<T> | T;
};

export class OverrideSource {
  constructor(
    readonly type: string,
    private values: NestedOverrideObj,
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
      const parentServiceName = service.rawConfig?.parent;
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
          const exposedItems = _.pickBy(pickFromService.config, (itemConfig) => !!itemConfig.type.getDefItem('expose'));
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

      // process the regular config schema items
      for (const itemKey in service.rawConfig?.schema) {
        const itemDef = service.rawConfig?.schema[itemKey];
        service.addConfigItem(new DmnoConfigItem(itemKey, itemDef, service));
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


  getService(descriptor: string | { serviceName?: string, packageName?: string }) {
    if (_.isString(descriptor)) {
      return this.services[descriptor];
    } else {
      if (descriptor.serviceName) return this.services[descriptor.serviceName];
      if (descriptor.packageName) return this.servicesByPackageName[descriptor.packageName];
    }
    console.log(descriptor);
    throw new Error(`unable to find service - ${descriptor}`);
  }

  get cacheFilePath() { return `${this.rootPath}/.dmno/cache.json`; }
  private valueCache: Record<string, CacheEntry> = {};
  private cacheLastLoadedAt: Date | undefined;
  private async loadCache() {
    // might want to attach the CacheEntry to the workspace instead to get the key?
    // or we could always pass it around as needed
    CacheEntry.encryptionKey = ENCRYPTION_KEY;

    if (!fs.existsSync(this.cacheFilePath)) return;
    const cacheRawStr = await fs.promises.readFile(this.cacheFilePath, 'utf-8');
    const cacheRaw = JSON.parse(cacheRawStr) as SerializedCache;
    for (const itemCacheKey in cacheRaw.items) {
      this.valueCache[itemCacheKey] = await CacheEntry.fromSerialized(itemCacheKey, cacheRaw.items[itemCacheKey]);
    }
    this.cacheLastLoadedAt = new Date();
  }
  private async writeCache() {
    // we don't want to write a file if the cache has not changed because it will trigger vite to reload
    if (this.cacheLastLoadedAt && _.every(this.valueCache, (item) => item.updatedAt < this.cacheLastLoadedAt!)) {
      return;
    }

    const serializedCache: SerializedCache = {
      version: '0.0.1',
      items: _.mapValues(this.valueCache, (cacheItem) => cacheItem.toJSON()),
    };
    const serializedCacheStr = JSON.stringify(serializedCache, null, 2);
    await fs.promises.writeFile(this.cacheFilePath, serializedCacheStr, 'utf-8');
  }
  async getCacheItem(key: string, usedBy?: string) {
    if (key in this.valueCache) {
      if (usedBy) this.valueCache[key].usedByItems.add(usedBy);
      return this.valueCache[key].value;
    }
  }
  async setCacheItem(key: string, value: string, usedBy?: string) {
    this.valueCache[key] = new CacheEntry(key, value, { usedBy });
  }


  toJSON() {
    return {
      services: _.map(this.services, (s) => s.toJSON()),
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
  readonly rawConfig?: ServiceConfigSchema;
  /** error encountered while _loading_ the config schema */
  readonly configLoadError?: ConfigLoadError;
  /** error within the schema itself */
  readonly schemaErrors: Array<SchemaError> = []; // TODO: probably want a specific error type...?

  /** processed config items - not necessarily resolved yet */
  readonly config: Record<string, DmnoConfigItem | DmnoPickedConfigItem> = {};

  readonly workspace: DmnoWorkspace;

  private plugins: Record<string, DmnoPlugin>;
  private overrideSources = [] as Array<OverrideSource>;

  constructor(opts: {
    isRoot: boolean,
    packageName: string,
    path: string,
    rawConfig: ServiceConfigSchema | ConfigLoadError,
    workspace: DmnoWorkspace,
    plugins?: Record<string, DmnoPlugin>,
  }) {
    this.workspace = opts.workspace;

    this.isRoot = opts.isRoot;
    this.packageName = opts.packageName;
    this.path = opts.path;

    this.plugins = opts.plugins || {};

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

    const localOverridesPath = path.resolve(this.path, '.dmno/.env.local');
    if (fs.existsSync(localOverridesPath)) {
      const fileRaw = await fs.promises.readFile(localOverridesPath, 'utf-8');
      const fileObj = dotenv.parse(Buffer.from(fileRaw));

      // TODO: probably want to run these through the same nested separator logic?
      this.overrideSources.push(new OverrideSource('dotenv/local', fileObj));
    }

    // load multiple override files
    // .env.{ENV}.local
    // .env.local
    // .env.{ENV}
    // .env

    // TODO: support other formats (yaml, toml, json) - probably should all be through a plugin system
  }

  async resolveConfig() {
    const configFromOverrides = await this.loadOverrideFiles();

    for (const itemKey in this.config) {
      const configItem = this.config[itemKey];
      const itemPath = configItem.getPath(true);

      // TODO: deal with nested items

      // set override from environment (process.env)

      _.each([
        this.workspace.processEnvOverrides,
        ...this.overrideSources,
      ], (overrideSource) => {
        const overrideVal = overrideSource.getOverrideForPath(itemPath);
        if (overrideVal !== undefined) {
          configItem.overrides.push({
            source: overrideSource.type,
            value: overrideVal,
          });
        }
      });

      // currently this resolve fn will trigger resolve on nested items
      await configItem.resolve(new ResolverContext(this, configItem.getPath()));
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

  get isValid() {
    if (this.configLoadError) return false;
    if (this.schemaErrors?.length) return false;
    return true;
  }

  toJSON(): SerializedService {
    return {
      isValid: this.isValid,
      isResolved: true,
      packageName: this.packageName,
      serviceName: this.serviceName,
      configLoadError: this.configLoadError?.toJSON(),
      schemaErrors:
        this.schemaErrors?.length
          ? _.map(this.schemaErrors, (err) => err.toJSON())
          : undefined,

      config: _.mapValues(this.config, (item, _key) => item.toJSON()),
    };
  }
}

export class ResolverContext {
  constructor(private service: DmnoService, private itemPath: string) {

  }

  get fullPath() { return `${this.service.serviceName}!${this.itemPath}`; }

  get(itemPath: string) {
    const item = this.service.getConfigItemByPath(itemPath);
    if (!item) {
      throw new Error(`Tried to get item that does not exist ${itemPath}`);
    }
    if (!item.isResolved) {
      throw new Error(`Tried to access item that was not resolved - ${item.getPath()}`);
    }
    return item.resolvedValue;
  }

  async getCacheItem(key: string) {
    return this.service.workspace.getCacheItem(key, this.fullPath);
  }
  async setCacheItem(key: string, value: ConfigValue) {
    if (value === undefined || value === null) return;
    return this.service.workspace.setCacheItem(key, value.toString(), this.fullPath);
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
  /** resolved value _before_ coercion logic applied */
  resolvedRawValue?: ConfigValue;
  /** error encountered during resolution */
  resolutionError?: Error;

  /** resolved value _after_ coercion logic applied */
  resolvedValue?: ConfigValue;

  // not sure if the coercion error should be stored in resolution error or split?
  /** error encountered during coercion step */
  coercionError?: CoercionError;


  /** more details about the validation failure if applicable */
  validationErrors?: Array<ValidationError>;
  /** whether the final resolved value is valid or not */
  get isValid(): boolean | undefined {
    if (this.coercionError) return false;
    if (this.validationErrors === undefined) return undefined;
    return this.validationErrors.length === 0;
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
    const itemKey = (respectImportOverride && this.type.getDefItem('importEnvKey')) || this.key;
    if (this.parent instanceof DmnoConfigItemBase) {
      const parentPath = this.parent.getPath(respectImportOverride);
      return `${parentPath}.${itemKey}`;
    }
    return itemKey;
  }

  async resolve(ctx: ResolverContext) {
    // resolve children of objects... this will need to be thought through and adjusted

    for (const childKey in this.children) {
      // note - this isn't right, each resolve will probably need a new context object?
      // an we'll need to deal with merging values set by the parent with values set in the child
      await this.children[childKey].resolve(ctx);
    }

    // console.log(`> resolving ${this.parentService?.serviceName}/${this.key}`);
    if (this.valueResolver) {
      try {
        await this.valueResolver.resolve(ctx);
        this.resolvedRawValue = this.valueResolver.resolvedValue;
      } catch (err) {
        debug('resolution failed', this.key, err);
        this.resolutionError = err as Error;
      }
    }

    // take into account overrides
    if (this.overrides.length) {
      // console.log('found overrides', this.overrides);
      // TODO: filter out for env-specific overrides
      this.resolvedRawValue = this.overrides[0].value;
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
        const coerceResult = this.type.coerce(_.cloneDeep(this.resolvedRawValue), ctx);
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
    const validationResult = this.type.validate(_.cloneDeep(this.resolvedValue), ctx);
    this.validationErrors = validationResult === true ? [] : validationResult;

    debug(
      `${this.parentService?.serviceName}/${this.getPath()} = `,
      JSON.stringify(this.resolvedRawValue),
      JSON.stringify(this.resolvedValue),
      this.isValid ? '✅' : `❌ ${this.validationErrors?.[0]?.message}`,
    );
  }

  toJSON(): SerializedConfigItem {
    return {
      key: this.key,
      isValid: this.isValid,

      resolvedRawValue: this.resolvedRawValue,
      resolvedValue: this.resolvedValue,
      isResolved: this.isResolved,
      children: _.mapValues(this.children, (c) => c.toJSON()),

      // schemaErrors
      coercionError: this.coercionError?.toJSON(),

      validationErrors:
        this.validationErrors?.length
          ? _.map(this.validationErrors, (err) => err.toJSON())
          : undefined,
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
    this.valueResolver = new PickedValueResolver(this.def.sourceItem, this.def.transformValue);
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
