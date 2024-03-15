import _ from 'lodash-es';
import { DmnoBaseTypes, DmnoDataType, DmnoSimpleBaseTypeNames } from './base-types';
import {
  ConfigValue,
  ValueResolverDef, ConfigValueOverride, ConfigValueResolver, processResolverDef, PickedValueResolver,
} from './resolvers';
import { getConfigFromEnvVars } from './lib/env-vars';

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


export type TypeValidationResult = boolean | undefined | void | Error | Array<Error>;

/**
 * options for defining an individual config item
 * @category HelperMethods
 */

export type ConfigItemDefinition = {
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
  extends?: TypeExtendsDefinition;

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
  /** service name */
  name?: string,
  /** name of parent service (if applicable) */
  parent?: string,
  /** array of config items to be picked from parent */
  pick?: Array<PickConfigItemDefinition | string>,
  /** the config schema itself */
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
  coercionError?: Error;


  /** more details about the validation failure if applicable */
  validationErrors?: Array<Error>;
  /** whether the final resolved value is valid or not */
  get isValid(): boolean | undefined {
    if (this.validationErrors === undefined) return undefined;
    return this.validationErrors.length === 0;
  }



  abstract getDefItem<T extends keyof ConfigItemDefinition>(key: T): ConfigItemDefinition[T];

  // not sure if this is the right pattern... here we're grabbing things on demand
  // but we may want to pre-process it all once
  get summary() { return this.getDefItem('summary'); }
  get description() { return this.getDefItem('description'); }
  get expose() { return this.getDefItem('expose'); }
  get typeDescription() { return this.getDefItem('typeDescription'); }
  get externalDocs() { return this.getDefItem('externalDocs'); }
  get ui() { return this.getDefItem('ui'); }
  get secret() { return this.getDefItem('secret'); }
  get required() { return this.getDefItem('required'); }
  get useAt() { return this.getDefItem('useAt'); }
  get value() { return this.getDefItem('value'); }
  get importEnvKey() { return this.getDefItem('importEnvKey'); }
  get exportEnvKey() { return this.getDefItem('exportEnvKey'); }

  abstract validate(val: any, ctx: ResolverContext): TypeValidationResult;
  abstract asyncValidate(val: any, ctx: ResolverContext): Promise<TypeValidationResult>;
  abstract coerce(val: any, ctx: ResolverContext): any;

  children: Record<string, DmnoConfigItemBase> = {};

  get parentService(): DmnoService | undefined {
    if (this.parent instanceof DmnoService) {
      return this.parent;
    } else if (this.parent instanceof DmnoConfigItemBase) {
      return this.parent.parentService;
    }
  }

  getPath(respectImportOverride = false): string {
    const itemKey = (respectImportOverride && this.importEnvKey) || this.key;
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
        console.log('resolution failed', this.key, err);
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
        // TODO: we may need to do something more complex here to expose the parent type's coerce fn
        this.resolvedValue = this.coerce(_.cloneDeep(this.resolvedRawValue), ctx);
      } catch (err) {
        this.coercionError = err as Error;
      }
    }

    // run validation logic
    // NOTE - again, we are only running this if the resolved value is not empty
    // but we'll need to think through how we handle empty values

    // handle required errors first, so every validation does not need to handle empty logic
    // TODO: need to do more thinking about undefined/null/empty strings...
    // we might want to handle some of that in coercion, so we only need to deal with one case
    if (this.resolvedValue === undefined || this.resolvedValue === null || this.resolvedValue === '') {
      if (this.getDefItem('required')) {
        this.validationErrors = [new Error('Value is required, but is currently empty')];
      } else {
        // this marks the item as being "valid"
        this.validationErrors = [];
      }
    } else {
      try {
        // TODO: all this logic handling true/false/errors should probably live somewhere else?
        const validationResult = this.validate(_.cloneDeep(this.resolvedValue), ctx);

        // TODO: think through validation fn shape - how to return status and errors...
        if (validationResult === false) {
          // not sure if we should even allow this...?
          this.validationErrors = [new Error('Validation failed - no more info provided')];
        } else if (
          validationResult === undefined
          || validationResult === true
          || (_.isArray(validationResult) && validationResult.length === 0)
        ) {
          // isValid is based on checking validationErrors being an empty array
          this.validationErrors = [];
        } else if (validationResult instanceof Error) {
          this.validationErrors = [validationResult];
        } else if (_.isArray(validationResult) && validationResult[0] instanceof Error) {
          // TODO: might want to verify all array items are errors...?
          this.validationErrors = validationResult;
        } else {
          this.validationErrors = [new Error(`Validation returned invalid result: ${validationResult}`)];
        }
      } catch (err) {
        // TODO: handle array of errors case, check that it's actually an error
        if (err instanceof Error) {
          this.validationErrors = [err];
        } else if (_.isArray(err)) {
          this.validationErrors = err as Array<Error>;
        } else {
          this.validationErrors = [new Error(`Validation threw a non-error: ${err}`)];
        }
      }
    }


    console.log(
      `${this.parentService?.serviceName}/${this.getPath()} = `,
      JSON.stringify(this.resolvedRawValue),
      JSON.stringify(this.resolvedValue),
      this.isValid ? '✅' : `❌ ${this.validationErrors?.[0]?.message}`,
    );
  }
}



// this is a "processed" config item
export class DmnoConfigItem extends DmnoConfigItemBase {
  readonly typeChain: Array<DmnoDataType> = [];

  readonly schemaError?: Error;

  readonly def: ConfigItemDefinition;

  constructor(
    key: string,
    defOrShorthand: ConfigItemDefinitionOrShorthand,
    parent?: DmnoService | DmnoConfigItem,
  ) {
    super(key, parent);

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
      // this.initializeSettings();

      this.initializeChildren();

      const unprocessedValueResolver = this.getDefItem('value');
      if (unprocessedValueResolver !== undefined) {
        this.valueResolver = processResolverDef(unprocessedValueResolver);
      }
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
        _.each(childDefs, (childDef, childKey) => {
          const childItem = new DmnoConfigItem(childKey, childDef, this);
          this.children[childKey] = childItem;
        });
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



  // TODO: DRY THIS UP!
  // also might want to still pass the ctx through
  // also might want to make type instance settings stuff available for more than just coerce/validate?
  // also might need to make the parent type fn availble (ie a validation can call the parent validation)
  coerce(val: any, ctx: ResolverContext) {
    if (this.def.coerce !== undefined) return this.def.coerce(val, ctx);
    for (let i = 0; i < this.typeChain.length; i++) {
      const ancestorType = this.typeChain[i];
      if (ancestorType.typeDef.coerce !== undefined) {
        return ancestorType.typeDef.coerce(val, ancestorType.typeInstanceOptions);
      }
    }
    return val;
  }
  validate(val: any, ctx: ResolverContext) {
    if (this.def.validate !== undefined) {
      const result = this.def.validate(val, ctx);
      if (result === false) return result;
    }
    for (let i = 0; i < this.typeChain.length; i++) {
      const ancestorType = this.typeChain[i];
      if (ancestorType.typeDef.validate !== undefined) {
        return ancestorType.typeDef.validate(val, ancestorType.typeInstanceOptions);
      }
    }
    return true;
  }
  async asyncValidate(val: any, ctx: ResolverContext) {
    if (this.def.asyncValidate !== undefined) return this.def.asyncValidate(val, ctx);
    for (let i = 0; i < this.typeChain.length; i++) {
      const ancestorType = this.typeChain[i];
      if (ancestorType.typeDef.asyncValidate !== undefined) {
        return ancestorType.typeDef.asyncValidate(val, ancestorType.typeInstanceOptions);
      }
    }
    return true;
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

    // fill in settings from the actual source item
    // this.initializeSettings();
    this.initializeChildren();

    // each item in the chain could have a value transformer, so we must follow the entire chain
    this.valueResolver = new PickedValueResolver(this.def.sourceItem, this.def.transformValue);
  }

  getDefItem<T extends keyof ConfigItemDefinition>(key: T): ConfigItemDefinition[T] {
    // whereas all other config (other than the key) is based on the original ConfigItem
    // note - if we decide we want to allow picked items to alter more config from the original
    // we'll need to adjust this to follow the chain
    return (this.originalConfigItem as any)[key];
  }

  /** the real source config item - which defines most of the settings */
  get originalConfigItem() {
    // we know the first item in the list will be the actual source (and a DmnoConfigItem)
    return this.pickChain[0] as DmnoConfigItem;
  }

  private initializeChildren() {
    if (this.originalConfigItem.children) {
      _.each(this.originalConfigItem.children, (sourceChild, childKey) => {
        this.children[childKey] = new DmnoPickedConfigItem(sourceChild.key, { sourceItem: sourceChild }, this);
      });
    }
  }

  coerce(val: any, ctx: ResolverContext) {
    return this.originalConfigItem.coerce(val, ctx);
  }
  validate(val: any, ctx: ResolverContext) {
    return this.originalConfigItem.validate(val, ctx);
  }
  async asyncValidate(val: any, ctx: ResolverContext) {
    return this.originalConfigItem.asyncValidate(val, ctx);
  }
}
