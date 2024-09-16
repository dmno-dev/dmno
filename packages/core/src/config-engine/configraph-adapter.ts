import {
  Configraph,
  ConfigraphBaseTypes,
  ConfigraphDataTypesRegistry,
  ConfigraphEntity,
  ConfigraphNode,
  ConfigraphNodeBase,
  SerializedConfigraphEntity,
} from '@dmno/configraph';

import { RedactMode } from '../lib/redaction-helpers';

export {
  ConfigraphBaseTypes as DmnoBaseTypes,

  // error types
  ConfigLoadError, CoercionError, ValidationError, ResolutionError,
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


// // absolutely gnarly and illegible stuff to make the types work :(
// export function createDmnoDataType<T>(
//   ...args: Parameters<typeof createConfigraphDataType<T, DmnoDataTypeMetadata>>
// ): ReturnType<typeof createConfigraphDataType<T, DmnoDataTypeMetadata>> {
//   return createConfigraphDataType(...args);
// }
// const t1 = createDmnoDataType<{ foo: string }>({
//   extends: 'string',
//   sensitive: true,
//   badKey: 1,
// });
// t1({ foo: 'asdf', bar: 'x' });



// way more legible, but super weird that we are involving a class like this
// abusing type generics on a class in order to simplify things a bit...
class DmnoDataTypesRegistry extends ConfigraphDataTypesRegistry<DmnoDataTypeMetadata> {}
const dmnoDataTypesRegistry = new DmnoDataTypesRegistry();
export const createDmnoDataType = dmnoDataTypesRegistry.create;



// class DmnoDataTypesRegistry<M = DmnoDataTypeMetadata> {
//   // eslint-disable-next-line class-methods-use-this
//   create<T>(...opts: Parameters<typeof createConfigraphDataType<T, M>>) {
//     return createConfigraphDataType<T, M>(...opts);
//   }
// }
// const createDmnoDataType2 = (new DmnoDataTypesRegistry()).create;

// const t1 = createDmnoDataType({});
// const t2 = createDmnoDataType<{ foo: string }>({
//   extends: t1({ foo: 1 }),
//   sensitive: true,
//   badKey: 1,
// });

// t1({ foo: 1 });


// t2({ foo: 'asdf', bar: 'x' });




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


export class DmnoConfigraph extends Configraph<DmnoServiceSettings> {
  defaultDataTypeRegistry = dmnoDataTypesRegistry;

  // we dont need the options available on the Configraph constructor
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor() { super(); }
}
export class DmnoConfigraphServiceEntity extends ConfigraphEntity<DmnoServiceSettings> {
  nodeClass = DmnoConfigraphNode;


  get dynamicConfig() { return this.getMetadata('dynamicConfig'); }
  get redactSensitiveLogs() { return this.getMetadata('redactSensitiveLogs'); }
  get interceptSensitiveLeakRequests() { return this.getMetadata('interceptSensitiveLeakRequests'); }
  get preventClientLeaks() { return this.getMetadata('preventClientLeaks'); }

  toJSON() {
    return {
      ...super.toJSON(),
      settings: {
        dynamicConfig: this.dynamicConfig,
        redactSensitiveLogs: this.redactSensitiveLogs,
        interceptSensitiveLeakRequests: this.interceptSensitiveLeakRequests,
        preventClientLeaks: this.preventClientLeaks,
      },
    };
  }
}

export class DmnoConfigraphNode extends ConfigraphNode<DmnoDataTypeMetadata> {
  // get dynamicConfig() { return this.getMetadata('dynamicConfig'); }
  // get redactSensitiveLogs() { return this.getMetadata('redactSensitiveLogs'); }
  // get interceptSensitiveLeakRequests() { return this.getMetadata('interceptSensitiveLeakRequests'); }
  // get preventClientLeaks() { return this.getMetadata('preventClientLeaks'); }

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


  toJSON() {
    return {
      ...super.toJSON(),
      isDynamic: this.isDynamic,
    };
  }
}

