import _ from 'lodash-es';
import Debug from 'debug';
import {
  DmnoBaseTypes, DmnoDataType, DmnoSimpleBaseTypeNames,
} from './base-types';
import {
  ConfigValue,
  ValueResolverDef, ConfigValueOverride, ConfigValueResolver, PickedValueResolver,
} from '../resolvers';
import { getConfigFromEnvVars } from '../lib/env-vars';
import { SerializedConfigItem, SerializedService } from '../config-loader/serialization-types';
import { CoercionError, DmnoError, ValidationError } from './errors';


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
    if (item instanceof DmnoPickedConfigItem && this.rawConfig?.schema[item.key]) {
      // check if a picked item is conflicting with a regular item
      this.schemaErrors.push(new Error(`Picked config key conflicting with a locally defined item - "${item.key}"`));
    } else if (this.config[item.key]) {
      // TODO: not sure if we want to add the item anyway under a different key?
      // probably want to expose more info too
      this.schemaErrors.push(new Error(`Config keys must be unique, duplicate detected - "${item.key}"`));
    } else {
      this.config[item.key] = item;
    }
  }

  async resolveConfig() {
    const configFromEnv = getConfigFromEnvVars();

    for (const itemKey in this.config) {
      const configItem = this.config[itemKey];

      // TODO: set overrides from files

      // TODO: deal with nested items

      // set override from environment (process.env)
      const envOverrideValue = configFromEnv[configItem.getPath(true)];
      if (envOverrideValue !== undefined) {
        // TODO: not sure about coercion / validation? do we want to run it early?
        configItem.overrides.push({
          source: { type: 'environment' },
          value: envOverrideValue,
        });
      }

      // currently this resolve fn will trigger resolve on nested items
      await configItem.resolve(new ResolverContext(this));
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

  toJSON(): SerializedService {
    return {
      isValid: true,
      isResolved: true,
      packageName: this.packageName,
      serviceName: this.serviceName,
      config: _.mapValues(this.config, (item, _key) => item.toJSON()),
    };
  }
}

export class ResolverContext {
  constructor(private service: DmnoService) {

  }
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
