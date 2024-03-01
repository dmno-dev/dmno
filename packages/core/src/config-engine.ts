import _ from 'lodash-es';
import { DmnoBaseTypes, DmnoDataType, DmnoSimpleBaseTypeNames } from './base-types';
import { ConfigValueOrResolver } from './resolvers';

type ConfigRequiredAtTypes = 'build' | 'boot' | 'run' | 'deploy';

type ConfigContext = {
  get: (key: string) => any;
};
type ValueOrValueFromContextFn<T> = T | ((ctx: ConfigContext) => T);

// items (and types) can extend other types by either specifying
// - another type that was initialized - ex: `DmnoBaseTypes.string({ ... })`
// - another type that was not initialized - ex: `DmnoBaseTypes.string`
// - string label for a small subset of simple base types - ex: `'string'`
export type TypeExtendsDefinition = DmnoDataType | ((opts?: any) => DmnoDataType) | DmnoSimpleBaseTypeNames;

export type ConfigItemDefinition = Pick<DmnoConfigItemBase, 'summary' | 'description' | 'expose'> & {

  /** description of the data type itself, rather than the instance */
  typeDescription?: string;

  /** link to external documentation */
  externalDocs?: {
    description?: string,
    url: string,
  },

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
  },

  /** whether this config is sensitive and must be kept secret */
  secret?: ValueOrValueFromContextFn<boolean>;

  required?: ValueOrValueFromContextFn<boolean>;

  /** can this be overridden at all */
  overridable?: boolean

  /** at what time is this value required */
  useAt?: ConfigRequiredAtTypes | Array<ConfigRequiredAtTypes>;

  // we allow the fn that returns the data type so you can use the data type without calling the empty initializer
  // ie `DmnoBaseTypes.string` instead of `DmnoBaseTypes.string({})`;
  extends?: TypeExtendsDefinition,

  validate?: ((val: any, ctx: ConfigContext) => boolean),
  asyncValidate?: ((val: any, ctx: ConfigContext) => Promise<boolean>),

  /** import value a env variable with a different name */
  importEnvKey?: string;
  /** export value as env variable with a different name */
  exportEnvKey?: string;

  /** set the value, can be static, or a function, or use helpers */
  // value?: ValueOrValueFromContextFn<any>;
  value?: ConfigValueOrResolver;
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

export type WorkspaceConfig = {
  schema: Record<string, ConfigItemDefinitionOrShorthand>,
};
export type ServiceConfigSchema = {
  // service name
  name?: string,
  // name of parent service (if applicable)
  parent?: string,
  pick?: Array<PickConfigItemDefinition | string>,
  schema: Record<string, ConfigItemDefinitionOrShorthand>,
};

export function defineConfigSchema(opts: ServiceConfigSchema) {
  console.log('LOADING SCHEMA!', opts);
  // TODO: return initialized object
  return opts;
}

export function defineWorkspaceConfig(opts: WorkspaceConfig) {
  console.log('LOADING ROOT SCHEMA!', opts);
  return opts;
}




export class ConfigPath {
  constructor(readonly path: string) { }
}
export const configPath = (path: string) => new ConfigPath(path);







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
  readonly configLoadError?: Error;
  /** error within the schema itself */
  readonly schemaErrors: Array<Error> = []; // TODO: probably want a specific error type...?

  /** processed config items - not necessarily resolved yet */
  readonly config: Record<string, DmnoConfigItem | DmnoPickedConfigItem> = {};

  constructor(opts: {
    isRoot: boolean,
    packageName: string,
    path: string,
    rawConfig: ServiceConfigSchema | Error,
  }) {
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
      this.serviceName = this.rawConfig.name || (opts.isRoot ? 'root' : this.packageName);
    }
  }



  addConfigItem(item: DmnoConfigItem | DmnoPickedConfigItem) {
    if (this.config[item.key]) {
      // TODO: not sure if we want to add the item anyway under a different key?
      // probably want to expose more info too
      this.schemaErrors.push(new Error(`Config keys must be unique, duplicate detected - "${item.key}"`));
    } else {
      this.config[item.key] = item;
    }
  }
}

abstract class DmnoConfigItemBase {
  constructor(
    /** the item key / name */
    readonly key: string,
  ) {}

  /** short description of what this config item is for */
  summary?: string;
  /** longer description info including details, gotchas, etc... supports markdown  */
  description?: string;

  /** expose this item to be "pick"ed by other services, usually used for outputs of run/deploy */
  expose?: boolean;



  abstract getDefItem<T extends keyof ConfigItemDefinition>(key: T): ConfigItemDefinition[T];

  protected initializeSettings() {
    this.summary = this.getDefItem('summary');
    this.description = this.getDefItem('description');
    this.expose = this.getDefItem('expose');
  }
}

// this is a "processed" config item
export class DmnoConfigItem extends DmnoConfigItemBase {
  readonly typeChain: Array<DmnoDataType> = [];

  readonly schemaError?: Error;

  children?: Record<string, DmnoConfigItem>;

  readonly def: ConfigItemDefinition;

  constructor(key: string, defOrShorthand: ConfigItemDefinitionOrShorthand) {
    super(key);

    console.log(`>>>>> initializing config item key: ${key}`);


    // if the definition passed in was using a shorthand, first we'll unwrap that
    if (_.isString(defOrShorthand)) {
      this.def = { extends: defOrShorthand };
    } else if (_.isFunction(defOrShorthand)) {
      const shorthandFnResult = defOrShorthand();
      if (!(shorthandFnResult instanceof DmnoDataType)) {
        // TODO: put this in schema error instead?
        throw new Error('invalid schema as result of fn shorthand');
      } else {
        this.def = { extends: shorthandFnResult };
      }
    } else if (defOrShorthand instanceof DmnoDataType) {
      this.def = { extends: defOrShorthand };
    } else if (_.isObject(defOrShorthand)) {
      this.def = defOrShorthand;
    } else {
      // TODO: put this in schema error instead?
      throw new Error('invalid item schema');
    }


    try {
    // initialize the chain of extends/parents
      this.initializeExtendsChain();
      // now fill in all the settings using the schema and the type ancestors
      this.initializeSettings();

      this.initializeChildren();
    } catch (err) {
      this.schemaError = err as Error;
      console.log(err);
    }
  }

  private initializeExtendsChain() {
    // if no type/extends is specified, we infer the type if a static non-string value is provided
    // and otherwise assume it's a basic string
    if (!this.def.extends) {
      let inferredType;
      if (this.def.value !== undefined) {
        if (_.isBoolean(this.def.value)) inferredType = DmnoBaseTypes.boolean();
        else if (_.isNumber(this.def.value)) inferredType = DmnoBaseTypes.number();
      }
      // TODO: can probably attempt to infer type from certain kinds of resolver (like a toggle)

      this.typeChain.push(inferredType || DmnoBaseTypes.string({}));
      return;
    }

    // otherwise, we follow up the chain and make sure each parent is initialized properly

    // NOTE - when our config files are read in as a non-module file, we get weird problems
    // where `instanceof DmnoDataType` no longer works...
    // the workaround for now is that our config files must be named with a ".mts" extension which
    // forces tsx to treat it as ESM, regardless of if the package.json file of the containing
    // service is marked `type: "module"` or not
    // https://github.com/privatenumber/tsx/issues/442 - some maybe related info?


    // TODO: not sure why TS demands I explicitly say this might be undefined
    let currentParent: typeof this.def.extends | undefined = this.def.extends;
    while (currentParent) {
      // deal with string case - only valid for simple base types - `extends: 'number'`
      if (_.isString(currentParent)) {
        console.log('found string parent, initializing', currentParent);
        if (!DmnoBaseTypes[currentParent]) {
          throw new Error(`found invalid parent (string) in extends chain - "${currentParent}"`);
        } else {
          const initializedDataType = DmnoBaseTypes[currentParent]({}) as DmnoDataType;
          this.typeChain.push(initializedDataType);
        }
      // deal with uninitialized case - `extends: DmnoBaseTypes.number`
      } else if (_.isFunction(currentParent)) {
        const initializedDataType = currentParent({});
        if (initializedDataType instanceof DmnoDataType) {
          this.typeChain.push(initializedDataType);
        } else {
          throw new Error('found invalid parent (as result of fn) in extends chain');
        }
      // normal case - `extends: DmnoBaseTypes.number({ ... })`
      } else if (currentParent instanceof DmnoDataType) {
        this.typeChain.push(currentParent);
      // anything else is considered an error
      } else if (currentParent) {
        throw new Error('found invalid parent in extends chain');
      }

      currentParent = this.typeChain[this.typeChain.length - 1].typeDef.extends;
    }
  }

  private initializeChildren() {
    // follow up the chain until we find a type that has children (if applicable)
    // then get the children from the datatype, and initialize a new DmnoConfigItem for each
    // this will handle deeply nested stuff since those config items could have more children inside
    for (let i = 0; i < this.typeChain.length; i++) {
      const ancestorType = this.typeChain[i];
      if (ancestorType.typeDef.getChildren) {
        const childDefs = ancestorType.typeDef.getChildren(ancestorType.typeInstanceOptions);
        console.log(childDefs);
        this.children = _.mapValues(childDefs, (childDef, childKey) => new DmnoConfigItem(childKey, childDef));
        break;
      }
    }
  }

  /** helper to unroll config schema using the type chain of parent "extends"  */
  getDefItem<T extends keyof ConfigItemDefinition>(key: T): ConfigItemDefinition[T] {
    // first check if the item definition itself has a value
    if (this.def[key] !== undefined) {
      return this.def[key];
    // otherwise run up the ancestor heirarchy
    } else {
      for (let i = 0; i < this.typeChain.length; i++) {
        const ancestorType = this.typeChain[i];
        if (ancestorType.typeDef[key] !== undefined) {
          return ancestorType.typeDef[key] as any;
        }
      }
    }
  }

  validate(val: any) {
    // TODO: currently this will run all of the parents' validations
    // I think instead we want to run only the first, but optionally pass in a way to call the next parent?
    // or maybe we just call the first parent and call it a day?

    // first handle validations from the type chain
    for (let i = 0; i < this.typeChain.length; i++) {
      const ancestorType = this.typeChain[i];
      if (ancestorType.typeDef.validate) {
        try {
          // we probably want to move the validate call that passes throgh typeInstanceOptions into the DmnoDataType class?
          const typeValidationResult = ancestorType.typeDef.validate(val, ancestorType.typeInstanceOptions);
          if (typeValidationResult === false) {
            // TODO: need to include info about which type/parent had the validation that failed
            return { valid: false, message: 'type validation failed' };
          }
        } catch (err) {
          return { valid: false, message: (err as any).message };
        }
      }
    }

    // now check if the item itself has a validation defined in the config schema
    if (this.def.validate) {
      try {
        // @ts-ignore
        const itemValidationResult = this.def.validate(val);
        if (itemValidationResult === false) {
          return { valid: false, message: 'config item validation failed' };
        }
      } catch (err) {
        return { valid: false, message: (err as any).message };
      }
    }

    return { valid: true };
  }

  normalize(val: any) {
    // TODO: figure out how we want to handle this...
    // do we start with nearest ancestor and stop when we've found a normalize fn?
    // do we do some base string-y coercion first? or just make those utils available?

    for (let i = 0; i < this.typeChain.length; i++) {
      const ancestorType = this.typeChain[i];
      if (ancestorType.typeDef.normalize) {
        try {
          const normalizedResult = ancestorType.typeDef.normalize(val, ancestorType.typeInstanceOptions);
          return normalizedResult;
        } catch (err) {
          // what to do on error?
          console.log('normalization failed :(', err);
          throw err;
        }
      }
    }

    // if no normalize fn was found, we just return the value itself
    return val;
  }
}

// TODO: we could merge this with the above and handle both cases? we'll see
export class DmnoPickedConfigItem extends DmnoConfigItemBase {
  /** full chain of items up to the actual config item */
  private pickChain: Array<DmnoConfigItem | DmnoPickedConfigItem> = [];

  constructor(key: string, private def: {
    pickItem: DmnoConfigItem | DmnoPickedConfigItem,
    transformValue?: (val: any) => any,
  }) {
    super(key);

    // we'll follow through the chain of picked items until we get to a real config item
    // note we're storing them in the opposite order as the typechain above
    // because we'll want to traverse them in this order to do value transformations
    this.pickChain.unshift(this.def.pickItem);
    while (this.pickChain[0] instanceof DmnoPickedConfigItem) {
      this.pickChain.unshift(this.pickChain[0].def.pickItem);
    }

    // fill in settings from the actual source item
    this.initializeSettings();
  }

  getDefItem<T extends keyof ConfigItemDefinition>(key: T): ConfigItemDefinition[T] {
    return (this.sourceItem as any)[key];
  }

  /** the real source config item  */
  get sourceItem() {
    // we know the first item in the list will be the actual source (and a DmnoConfigItem)
    return this.pickChain[0] as DmnoConfigItem;
  }

  validate(val: any) {
    return this.sourceItem.validate(val);
  }
  normalize(val: any) {
    return this.sourceItem.normalize(val);
  }
}
