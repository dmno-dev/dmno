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
  ConfigLoadError,
  ConfigraphDataTypeDefinitionOrShorthand, ConfigraphEntity,
  SchemaError,
} from '@dmno/configraph';

import { getConfigFromEnvVars } from '../lib/env-vars';
import { SerializedConfigItem, SerializedService, SerializedWorkspace } from '../config-loader/serialization-types';
import { stringifyJsonWithCommentBanner } from '../lib/json-utils';
import { loadDotEnvIntoObject, loadServiceDotEnvFiles } from '../lib/dotenv-utils';
import { asyncMapValues } from '../lib/async-utils';
import { RedactMode } from '../lib/redaction-helpers';
import {
  DmnoConfigraph, DmnoConfigraphServiceEntity, DmnoDataTypeMetadata, DmnoServiceSettings,
} from './configraph-adapter';

const debug = Debug('dmno');

export type CacheMode = 'skip' | 'clear' | true;

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
  schema: Record<string, ConfigraphDataTypeDefinitionOrShorthand<DmnoDataTypeMetadata>>,
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
    return encrypt(CacheEntry.encryptionKey, JSON.stringify(this.value), CacheEntry.encryptionKeyName);
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
    const valueStr = await decrypt(CacheEntry.encryptionKey, raw.encryptedValue, CacheEntry.encryptionKeyName);
    // we are also tossing out the saved "usedBy" entries since we'll have new ones after this config run
    return new CacheEntry(itemKey, JSON.parse(valueStr), {
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
    // first we need to just determine the services order based on parent ids, so we can _initialize_ in the right order
    for (const service of this.servicesArray) {
      this.servicesDag.setNode(service.serviceName, { /* can add more metadata here */ });
    }

    // first set up graph edges based on "parent"
    for (const service of this.servicesArray) {
    // check if parent service is valid
      const parentServiceName = !service.rawConfig?.isRoot ? service.rawConfig?.parent : undefined;
      if (parentServiceName) {
        // NOTE - errors are dealt with later by configraph
        if (this.services[parentServiceName] && parentServiceName !== service.serviceName) {
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
        if (this.services[pickFromServiceName] && pickFromServiceName !== service.serviceName) {
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
        //! not sure if we want to allow adding errors from here?
        // but in configraph, it will not give a "cycle" error, it will give one that the parent was not found since it doesnt exist yet
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

  readonly configraph = new DmnoConfigraph();
  processConfig() {
    // we now initialize the configraph entities in the correct order
    for (const service of this.servicesArray) {
      // if we had an issue _loading_ the config, we dont add the service to the configraph

      service.configraphEntity = new DmnoConfigraphServiceEntity(this.configraph, {
        id: service.serviceName,
        // if we had a loading error, we dont add any actual info, just create the service
        ...!service.configLoadError && {
          configSchema: service.rawConfig?.schema as any,
          // pick is only available on non-root services
          ...service.rawConfig && !service.rawConfig.isRoot && {
            pickSchema: _.map(service.rawConfig.pick, (p) => {
              if (_.isString(p)) return p;
              return {
                ...p,
                // remap "source" to "entityId"
                entityId: p.source,
              };
            }),
          },
        },
      });
    }

    // and then process the entire graph
    this.configraph.processConfig();
  }

  async resolveConfig() {
    // await this.loadCache();
    await this.configraph.resolveConfig();
    // await this.writeCache();
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
  async setCacheItem(key: string, value: any, usedBy?: string) {
    if (this.cacheMode === 'skip') return undefined;
    this.valueCache[key] = new CacheEntry(key, value, { usedBy });
  }
  toJSON(): SerializedWorkspace {
    return {
      //! fix plugins
      // plugins: _.mapValues(this.plugins, (p) => p.toJSON()),
      plugins: {},
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

  readonly workspace: DmnoWorkspace;
  configraphEntity!: DmnoConfigraphServiceEntity;

  /** error within the schema itself */
  get schemaErrors() { return this.configraphEntity.schemaErrors; }

  // injectedPlugins: Array<DmnoPlugin> = [];
  // ownedPlugins: Array<DmnoPlugin> = [];

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

  get config() {
    return this.configraphEntity.configNodes;
  }

  //! need to fix this
  overrideSources: Array<any> = [];
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

  get isSchemaValid() {
    if (this.configLoadError) return false;
    return this.configraphEntity.isSchemaValid;
  }

  get isValid() {
    if (!this.isSchemaValid) return false;
    return this.configraphEntity.isValid;
  }

  getEnv() {
    const env: Record<string, any> = _.mapValues(this.configraphEntity.configNodes, (node) => {
      return node.resolvedValue;
    });
    return env;
  }
  // getInjectedEnvJSON(): InjectedDmnoEnv {
  //   // some funky ts stuff going on here... doesn't like how I set the values,
  //   // but otherwise the type seems to work ok?
  //   // const env: any = _.mapValues(this.configraphEntity.configNodes, (item) => item.toInjectedJSON());
  //   // // simple way to get settings passed through to injected stuff - we may want
  //   // env.$SETTINGS = this.settings;
  //   // return env as any;
  //   return {} as any;
  // }

  get settings(): DmnoServiceSettings {
    // TODO: we should probably cache this instead of recalculating on each access?
    return {
      dynamicConfig: this.configraphEntity.getMetadata('dynamicConfig'),
      preventClientLeaks: this.configraphEntity.getMetadata('preventClientLeaks'),
      redactSensitiveLogs: this.configraphEntity.getMetadata('redactSensitiveLogs'),
      interceptSensitiveLeakRequests: this.configraphEntity.getMetadata('interceptSensitiveLeakRequests'),
    };
  }

  toJSON(): SerializedService {
    return {
      packageName: this.packageName,
      serviceName: this.serviceName,
      path: this.path,
      configLoadError: this.configLoadError?.toJSON(),

      // this contains all the interesting stuff...
      ...this.configraphEntity.toJSON(),

      // injectedEnv: this.getInjectedEnvJSON(),
    };
  }
}
