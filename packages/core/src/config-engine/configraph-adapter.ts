import _ from 'lodash-es';
import {
  Configraph,
  ConfigraphDataTypesRegistry,
  ConfigraphEntity,
  ConfigraphNode,
} from '@dmno/configraph';


import { RedactMode } from '../lib/redaction-helpers';
import { SerializedConfigItem } from '../config-loader/serialization-types';
import {
  InjectedDmnoEnv, InjectedDmnoEnvItem,
} from './config-engine';
import { DmnoConfigraphCachingProvider } from './dmno-configraph-cache';

export {
  ConfigraphBaseTypes as DmnoBaseTypes,

  inject, collect, configPath,
  ResolverContext,

  // error types
  ConfigLoadError, SchemaError, ResolutionError, CoercionError, ValidationError,
} from '@dmno/configraph';
export { RedactMode };



type ConfigRequiredAtTypes = 'build' | 'boot' | 'run' | 'deploy';

export type DmnoDataTypeMetadata = {
  /** whether this config is sensitive and must be kept secret */
  sensitive?: boolean | {
    /** customize redact/masking behaviour rules (defaults to `show_first_2`) */
    redactMode?: RedactMode;
    /** list of allowed domains this sensitive item is allowed be sent to */
    allowedDomains?: Array<string>;
  };

  /** set if the item will be injected by a platform/framework */
  fromVendor?: string;

  /** at what time is this value required */
  useAt?: ConfigRequiredAtTypes | Array<ConfigRequiredAtTypes>;

  /** opt in/out of build-type code replacements - default is false unless changed at the service level */
  dynamic?: boolean;

  /** import value a env variable with a different name */
  importEnvKey?: string;
  /** export value as env variable with a different name */
  exportEnvKey?: string;

};

// way more legible, but super weird that we are involving a class like this
// abusing type generics on a class in order to simplify things a bit...
class DmnoDataTypesRegistry extends ConfigraphDataTypesRegistry<DmnoDataTypeMetadata> {}
const dmnoDataTypesRegistry = new DmnoDataTypesRegistry();
export const createDmnoDataType = dmnoDataTypesRegistry.create;



export type DynamicConfigModes =
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


export type DmnoServiceSettings = {
  /** default behaviour for "dynamic" vs "static" behaviour of config items */
  dynamicConfig?: DynamicConfigModes,
  /** enable patching global logging methods to redact sensitive config (where possible) */
  redactSensitiveLogs?: boolean,
  /** enable patching http to intercept sending sensitive to config to non allowed domains (where possible) */
  interceptSensitiveLeakRequests?: boolean,
  /** enable scanning all code and data for leaks before sending to the client (where possible) */
  preventClientLeaks?: boolean,
};

export type DmnoServiceMeta = {
  path?: string,
};
export type DmnoEntityMetadata = DmnoServiceSettings & DmnoServiceMeta;


export class DmnoConfigraph extends Configraph<DmnoEntityMetadata> {
  defaultDataTypeRegistry = dmnoDataTypesRegistry;
  cacheProvider = new DmnoConfigraphCachingProvider();

  // we dont need the options available on the Configraph constructor
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor() { super(); }
}
export class DmnoConfigraphServiceEntity extends ConfigraphEntity<
DmnoEntityMetadata, DmnoDataTypeMetadata, DmnoConfigraphNode
> {
  NodeClass = DmnoConfigraphNode;

  get dynamicConfig() { return this.getMetadata('dynamicConfig'); }
  get redactSensitiveLogs() { return this.getMetadata('redactSensitiveLogs'); }
  get interceptSensitiveLeakRequests() { return this.getMetadata('interceptSensitiveLeakRequests'); }
  get preventClientLeaks() { return this.getMetadata('preventClientLeaks'); }

  get settings() {
    return {
      dynamicConfig: this.dynamicConfig,
      redactSensitiveLogs: this.redactSensitiveLogs,
      interceptSensitiveLeakRequests: this.interceptSensitiveLeakRequests,
      preventClientLeaks: this.preventClientLeaks,
    };
  }

  toJSON() {
    return {
      ...super.toCoreJSON(),
      settings: this.settings,
      configNodes: _.mapValues(this.configNodes, (item, _key) => item.toJSON()),
    };
  }

  getInjectedEnvJSON(): InjectedDmnoEnv {
    // some funky ts stuff going on here... doesn't like how I set the values,
    // but otherwise the type seems to work ok?
    const env: any = _.mapValues(this.configNodes, (item) => item.toInjectedJSON());
    // simple way to get settings passed through to injected stuff - we may want
    env.$SETTINGS = this.settings;
    return env as any;
  }
}

export class DmnoConfigraphNode extends ConfigraphNode<DmnoDataTypeMetadata> {
  // get dynamicConfig() { return this.getMetadata('dynamicConfig'); }
  // get redactSensitiveLogs() { return this.getMetadata('redactSensitiveLogs'); }
  // get interceptSensitiveLeakRequests() { return this.getMetadata('interceptSensitiveLeakRequests'); }
  // get preventClientLeaks() { return this.getMetadata('preventClientLeaks'); }

  get isSensitive() {
    return !!this.type.getMetadata('sensitive');
  }

  get isDynamic() {
    // this resolves whether the item should actually be treated as static or dynamic
    // which takes into account the specific item's `dynamic` override
    // the parent's dynamicConfig setting and if the item is "sensitive" (if the servies is in `public_static` mode)

    // NOTE - this is the only place this logic exists

    // get the config default mode of the service
    const serviceDynamicConfigMode = (this.parentEntity as DmnoConfigraphServiceEntity)?.dynamicConfig;

    if (serviceDynamicConfigMode === 'only_dynamic') return true;
    if (serviceDynamicConfigMode === 'only_static') return false;

    const explicitSetting = this.type.getMetadata('dynamic');
    if (explicitSetting !== undefined) return explicitSetting;

    if (serviceDynamicConfigMode === 'default_dynamic') return true;
    if (serviceDynamicConfigMode === 'default_static') return false;

    // 'public_static' mode is default behaviour
    // sensitive = dynamic, non-sensitive = static
    return !!this.type.getMetadata('sensitive');
  }


  toJSON(): SerializedConfigItem {
    return {
      ...super.toCoreJSON(),
      children: _.mapValues(this.children, (c) => c.toJSON()),
      isDynamic: this.isDynamic,
      isSensitive: this.isSensitive,
    };
  }
  /** this is the shape that gets injected into an serialized json env var by `dmno run` */
  toInjectedJSON(): InjectedDmnoEnvItem {
    const sensitiveSettings = this.type.getMetadata('sensitive');
    return {
      ...this.isSensitive && { sensitive: 1 },
      // adds `redactMode` and `allowedDomains`
      ..._.isObject(sensitiveSettings) && sensitiveSettings,
      ...this.isDynamic && { dynamic: 1 },
      value: this.resolvedValue,
    };
  }

  // slight customization of ts type generation which includes some of our custom metadata
  typeGen = {
    customLabel: () => (this.isSensitive ? ' 🔐 _sensitive_' : ''),
    customSuffix: () => {
      const vendorName = this.type.getMetadata('fromVendor');
      return vendorName ? `_injected by ${vendorName}_` : undefined;
    },
  };
}

export {
  switchBy, switchByDmnoEnv, switchByNodeEnv, cacheFunctionResult,
} from '@dmno/configraph';

