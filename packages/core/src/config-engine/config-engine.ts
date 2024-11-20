import path from 'node:path';
import _ from 'lodash-es';
import Debug from 'debug';
import validatePackageName from 'validate-npm-package-name';
import graphlib from '@dagrejs/graphlib';
import {
  ConfigLoadError, ConfigraphDataTypeDefinitionOrShorthand, SchemaError,
} from '@dmno/configraph';
import { getConfigFromEnvVars } from '../lib/env-vars';
import { SerializedService, SerializedWorkspace } from '../config-loader/serialization-types';
import { loadServiceDotEnvFiles } from '../lib/dotenv-utils';
import { RedactMode } from '../lib/redaction-helpers';
import {
  DmnoConfigraph, DmnoConfigraphNode, DmnoConfigraphServiceEntity, DmnoDataTypeMetadata, DmnoServiceSettings,
  UseAtPhases,
} from './configraph-adapter';
import { DmnoPlugin } from './dmno-plugin';

const debug = Debug('dmno');

// we call this _immediately_ rather than when we need it because vite-node is injecting process.env.NODE_ENV
// TODO: we may need to respect some settings or something, so may need to do it later, but probably want to do it ASAP
const processEnvOverrides = getConfigFromEnvVars();

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

  /** iconify icon name */
  icon?: string, // might want to pick from ConfigraphEntityDef?
  /** custom color for this entity */
  color?: string, // might want to pick from ConfigraphEntityDef?
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

export class DmnoWorkspace {
  private services: Record<string, DmnoService> = {};
  private servicesArray: Array<DmnoService> = [];
  private servicesByPackageName: Record<string, DmnoService> = {};

  private rootServiceName = 'root';
  get rootService() { return this.services[this.rootServiceName]; }
  get rootPath() { return this.rootService.path; }

  readonly processEnvOverrides = new OverrideSource('process', undefined, 'ri:terminal-box-fill', processEnvOverrides);

  plugins: Record<string, DmnoPlugin> = {};

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

        // plugins need some other service metadata, so we pass it in here
        path: service.path,

        icon: service.rawConfig?.icon,
        color: service.rawConfig?.color,

        // if we had a loading error, we dont add any actual info, just create the service
        ...!service.configLoadError && {
          // service settings are applied as additional entity metadata
          ...service.rawConfig?.settings,

          configSchema: service.rawConfig?.schema as any,

          // pick and parentId is only available on non-root services
          ...service.rawConfig && !service.rawConfig.isRoot && {
            parentId: service.rawConfig.parent,
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

      for (const pluginName of service.ownedPluginIds) {
        service.configraphEntity.addOwnedPlugin(this.plugins[pluginName]);
      }
      for (const pluginName of service.injectedPluginIds) {
        service.configraphEntity.addInjectedPlugin(this.plugins[pluginName]);
      }
    }

    // and then process the entire graph
    this.configraph.processConfig();
  }

  async resolveConfig(opts?: {
    resolutionPhase?: UseAtPhases,
  }) {
    for (const service of this.allServices) {
      // reset overrides on all the individual nodes
      for (const node of Object.values(service.config)) {
        node.overrides = [];
      }

      // we want to load all the override files, since we may want to display them in the UI
      // but they will not be all enabled
      await service.loadOverrideFiles();

      // for now we'll apply the process.env level overrides to every service
      // TODO: think through how we can allow targeting specific services, and nested object nodes
      service.overrideSources.unshift(this.processEnvOverrides);

      // TODO: clean all of this up - just wanted to get basic overrides applied again
      // this currently does not support anything nested!
      _.each(service.overrideSources, (overrideSource) => {
        if (!overrideSource.enabled) return;
        _.each(overrideSource.values, (val, key) => {
          const node = service.configraphEntity.getConfigNodeByPath(key);
          if (!node) return;
          node.overrides.push({
            sourceType: overrideSource.type,
            sourceLabel: overrideSource.label,
            icon: overrideSource.icon,
            value: val,
          });
        });
      });
    }

    if (!this.rootService) {
      console.log('root service name', this.rootServiceName);
      console.log(Object.keys(this.services));
    }
    this.configraph.cacheProvider.cacheDirPath = path.join(this.rootService.path, '.dmno');
    await this.configraph.resolveConfig();


    // here we set errors to warnings if the item is not used in the current "phase" (build/boot)
    // but this is very naive, we probably dont want to be more specific about when we do this
    if (opts?.resolutionPhase) {
      for (const node of Object.values(this.configraph.nodesByFullPath)) {
        if (node instanceof DmnoConfigraphNode) {
          const useNodeAt = node.useAt;
          if (useNodeAt && !useNodeAt.includes(opts.resolutionPhase)) {
            console.log(node.schemaError);
            console.log(node.validationErrors);
            console.log(node.coercionError);

            if (node.validationErrors?.[0]) {
              node.validationErrors[0].isWarning = true;
            }
            if (node.resolutionError) {
              node.resolutionError.isWarning = true;
              console.log('updating node resolution error!');
            }
          }
        }
      }
    }
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

  readonly workspace: DmnoWorkspace;
  configraphEntity!: DmnoConfigraphServiceEntity;

  /** error within the schema itself */
  get schemaErrors() { return this.configraphEntity.schemaErrors; }

  injectedPluginIds: Array<string> = [];
  ownedPluginIds: Array<string> = [];

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

  get icon() {
    const cgIcon = this.configraphEntity.icon;
    if (cgIcon) return cgIcon;
    // adding some some default icons
    if (this.isRoot) return 'tabler:stack-3-filled';
    return 'octicon:container-24';
  }

  get config() {
    return this.configraphEntity.configNodes;
  }

  overrideSources: Array<OverrideSource> = [];
  async loadOverrideFiles() {
    // TODO: this is not at all optimized for speed...
    // particularly it is doing a check on if the file is gitignored
    // and if we are loading not in dev mode, we may just want to load files that will be applied
    const dotEnvFiles = await loadServiceDotEnvFiles(this.path, { onlyLoadDmnoFolder: true });

    // TODO: support other formats (yaml, toml, json) - probably should all be through a plugin system

    // loads multiple override files, in order from more specific to least
    // .env.{ENV}.local
    // .env.local
    // .env.{ENV}
    // .env

    this.overrideSources = _.map(dotEnvFiles, (dotEnvFile) => {
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

  get settings(): DmnoServiceSettings {
    // TODO: we should probably cache this instead of recalculating on each access?
    return {
      dynamicConfig: this.configraphEntity.getMetadata('dynamicConfig'),
      preventClientLeaks: this.configraphEntity.getMetadata('preventClientLeaks'),
      redactSensitiveLogs: this.configraphEntity.getMetadata('redactSensitiveLogs'),
      interceptSensitiveLeakRequests: this.configraphEntity.getMetadata('interceptSensitiveLeakRequests'),
    };
  }

  getInjectedEnvJSON() {
    return this.configraphEntity.getInjectedEnvJSON();
  }


  toJSON(): SerializedService {
    return {
      packageName: this.packageName,
      serviceName: this.serviceName,
      path: this.path,
      configLoadError: this.configLoadError?.toJSON(),

      // this contains all the interesting stuff...
      ...this.configraphEntity.toJSON(),

      // overriding icon, which now includes some defaults
      icon: this.icon,

      // config loading errors do not exist in the entity core
      isSchemaValid: this.isSchemaValid,
      isValid: this.isValid,
    };
  }
}
