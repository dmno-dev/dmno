import path from 'node:path';
import _ from 'lodash-es';
import Debug from 'debug';
import validatePackageName from 'validate-npm-package-name';
import graphlib from '@dagrejs/graphlib';
import {
  ConfigLoadError, ConfigraphDataTypeDefinitionOrShorthand, SchemaError,
} from '@dmno/configraph';
import { SerializedService, SerializedWorkspace } from '../config-loader/serialization-types';
import { RedactMode } from '../lib/redaction-helpers';
import {
  DmnoConfigraph, DmnoConfigraphNode, DmnoConfigraphServiceEntity, DmnoDataTypeMetadata, DmnoServiceSettings,
  UseAtPhases,
} from './configraph-adapter';
import { DmnoPlugin } from './dmno-plugin';
import {
  DmnoOverrideLoader, dotEnvFileOverrideLoader, processEnvOverrideLoader, OverrideSource,
} from './overrides';
import { asyncEachParallel, asyncEachSeries, asyncMapParallel } from '../lib/async-utils';

const debug = Debug('dmno');

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

  // ? Should this be part of settings? if inherited from parent, it probably should
  /** override loading plugins - if not specified, will default to loading process env vars and dotenv files */
  overrides?: Array<DmnoOverrideLoader | false>,
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



export class DmnoWorkspace {
  private services: Record<string, DmnoService> = {};
  private servicesArray: Array<DmnoService> = [];
  private servicesByPackageName: Record<string, DmnoService> = {};

  private rootServiceName = 'root';
  get rootService() { return this.services[this.rootServiceName]; }
  get rootPath() { return this.rootService.path; }

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

    // we dont care about pick-based cycles here, since they will be found later by configraph
    // and what we need to protect against is initializing the services in an impossible order
    // due to a parent-cycle

    // look for cycles in the services graph, add schema errors if present
    const graphCycles = graphlib.alg.findCycles(this.servicesDag);
    _.each(graphCycles, (cycleMemberNames) => {
    // each cycle is just an array of node names in the cycle
      _.each(cycleMemberNames, (name) => {
        // little odd to put the SchemaError on service.configLoadError
        // but the configraph entity does not exist yet and the fact that we
        // have a parent cycle means we can't actually initialize it at all
        this.services[name].configLoadError = new SchemaError(`Detected service parent cycle - ${cycleMemberNames.join(' + ')}`);
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
    await asyncEachParallel(this.allServices, async (service) => {
      // reset overrides on all the individual nodes
      for (const node of Object.values(service.config)) {
        node.overrides = [];
      }

      await service.loadOverrides();

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
    });

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
  configLoadError?: ConfigLoadError | SchemaError;

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
        this.serviceName = this.packageName;
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
  async loadOverrides() {
    this.overrideSources = [];

    const overridePlugins = this.rawConfig?.overrides
      ? _.compact(this.rawConfig?.overrides)
      // default behaviour is to load overrides from process.env and dotenv files
      : [processEnvOverrideLoader(), dotEnvFileOverrideLoader()];
    const overrideSources = await asyncMapParallel(overridePlugins, async (overridePlugin) => {
      // config lets you toggle behaviour using `SOME_CONDITION && somePlugin()` so we must filter out `false`
      if (!overridePlugin) return;
      return await overridePlugin.load({
        serviceId: this.serviceName,
        servicePath: this.path,
      });
    });
    this.overrideSources.push(..._.compact(_.flatten(overrideSources)));
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
