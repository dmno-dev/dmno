import _ from 'lodash-es';

import {
  ConfigValueResolver, InlineValueResolverDef, processInlineResolverDef, ResolverContext,
} from './resolvers';
import {
  CoercionError, EmptyRequiredValueError, SchemaError, ValidationError,
} from './errors';
import { ExternalDocsEntry } from './common';
import { SerializedConfigraphDataType } from './serialization-types';

type ArrayOrSingle<T> = T | Array<T>;

// items (and types) can extend other types by either specifying
export type ConfigraphTypeExtendsDefinition =
  // existing type that was initialized w/ settings - ex: `DmnoBaseTypes.string({ ... })`
  ConfigraphDataType |
  // existing type, but not initialized - ex: `DmnoBaseTypes.string`
  ConfigraphDataTypeFactoryFn<any, any> |
  // string label for a small subset of simple base types - ex: `'string'`
  ConfigraphSimpleBaseTypeNames;

export type TypeValidationResult = boolean | undefined | void | Error | Array<Error>;

export type ConfigraphDataTypeDefinitionOrShorthand<NodeMetadata = unknown> =
  CoreConfigraphDataTypeOptions<unknown, NodeMetadata> | ConfigraphTypeExtendsDefinition;

type CoreConfigraphDataTypeOptions<ExtendsTypeSettings = unknown, NodeMetadata = unknown> = NodeMetadata & {
  /** short description of what this config item is for */
  summary?: string;
  /** longer description info including details, gotchas, etc... supports markdown  */
  description?: string;

  //! this probably needs to be reworked a bit
  /** expose this item to be "pick"ed by other services, usually used for outputs of run/deploy */
  expose?: boolean;

  /** description of the data type itself, rather than the instance */
  typeDescription?: string;

  /** example value */
  exampleValue?: any;

  /** link to external documentation */
  externalDocs?: ArrayOrSingle<ExternalDocsEntry>;

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

  /** is this config item required, an error will be shown if empty */
  required?: boolean; // TODO: can this be a (ctx) => fn?

  /**
   * parent data type to inherit from
   * if not set will attempt to infer from a static value, or default to string
   * */
  extends?: ConfigraphTypeExtendsDefinition;

  // /** a validation function for the value, return true if valid, otherwise throw an error */
  // validate?: ((val: any, ctx: ResolverContext) => TypeValidationResult);
  // /** same as \`validate\` but async */
  // asyncValidate?: ((val: any, ctx: ResolverContext) => Promise<TypeValidationResult>);
  // /** a function to coerce values */
  // coerce?: ((val: any, ctx: ResolverContext) => any);

  /** validation function that can use type instance settings */
  validate?: (
    this: ConfigraphDataType<ExtendsTypeSettings>,
    val: any,
    ctx?: ResolverContext
  ) => TypeValidationResult;

  /** validation function that can use type instance settings */
  asyncValidate?: (
    this: ConfigraphDataType<ExtendsTypeSettings>,
    val: any,
    ctx?: ResolverContext
  ) => Promise<TypeValidationResult>;

  /** coerce function that can use type instance settings */
  coerce?: (
    this: ConfigraphDataType<ExtendsTypeSettings>,
    val: any,
    ctx?: ResolverContext
  ) => any;

  /** allows disabling or controling execution order of running the parent type's `validate` function (default = "before") */
  runParentValidate?: 'before' | 'after' | false;
  /** allows disabling or controling execution order of running the parent type's `asyncValidate` function (default = "before") */
  runParentAsyncValidate?: 'before' | 'after' | false;
  /** allows disabling or controling execution order of running the parent type's `coerce` function (default = "before") */
  runParentCoerce?: 'before' | 'after' | false;

  /** set the value, can be static, or a function, or use helpers */
  value?: InlineValueResolverDef;
};


// data types expose all the same options, except they additionally have a "settings schema"
// and their validations/normalize functions get passed in the _instance_ of those settings when invoked
/**
 * Represents the options for a ConfigraphDataType
 * @category HelperMethods
 */
type ReusableConfigraphDataTypeOptions = {
  // TODO: we maybe want to split this into package/name or even org/package/name?
  // TODO: figure out naming conventions (camel? Pascal? camel `package/typeName`)
  /** type identifier used internally */
  typeLabel?: string,

  /** define a schema for the settings that will be passed in when using this data type */
  // settingsSchema?: TypeSettings,

  /**
     * mark a type as NOT injectable by setting to false
     * note that all created types default to being injectable, and this is not inherited by another type that extends
     * */
  injectable?: false,
};

export type ConfigraphDataTypeDefinition<TypeSettings = unknown, Metadata = unknown> =
CoreConfigraphDataTypeOptions<TypeSettings, Metadata> & ReusableConfigraphDataTypeOptions;

/**
 * data type factory function - which is the result of `createConfigraphDataType`
 * This is the type of our base types and any custom types defined by the user
 * */
export type ConfigraphDataTypeFactoryFn<T, M> = ((opts?: T) => ConfigraphDataType<T, M>);

// /**
//  * utility type to extract the settings schema shape from a ConfigraphDataTypeFactoryFn (for example ConfigraphBaseTypes.string)
//  * this is useful when extending types and wanting to reuse the existing settings
//  * */
// export type ExtractSettingsSchema<F> =
//   F extends ConfigraphDataTypeFactoryFn<infer T> ? T : never;


export class ConfigraphDataType<InstanceOptions = any, Metadata = any> {
  // NOTE - note quite sure about this setup yet...
  // but the idea is to provide a wrapped version of the validate/coerce (the fns that need the type instance options)
  // while providing transparent access to the rest. This is so the ConfigItem can just walk up the chain of types
  // without having to understand the details... The other option is to revert that change and

  /** use instead of `instanceof ConfigraphDataType`
   * because there can be a different copy of dmno being used within vite from the dmno config loading process
   * */
  static checkInstanceOf(other: any) {
    return other?.typeDef && other?.primitiveTypeFactory;
  }


  parentType?: ConfigraphDataType;
  private _valueResolver?: ConfigValueResolver;

  readonly schemaErrors: Array<SchemaError> = [];

  constructor(
    readonly typeDef: ConfigraphDataTypeDefinition<InstanceOptions, Metadata>,
    readonly typeInstanceOptions?: InstanceOptions,
    /**
     * the factory function that created this item
     * Should be always defined unless this is an inline defined type from a config schema
     * */
    private _typeFactoryFn?: ConfigraphDataTypeFactoryFn<InstanceOptions, Metadata>,
    readonly _registry?: ConfigraphDataTypesRegistry<Metadata>,
  ) {
    // if this is already one of our primitive base types, we are done
    if (this.typeDef.extends === PrimitiveBaseType) {
      // we'll skip setting the parentType since the primitive base type is just a placeholder / marker

    // if extends is set, we make sure it is initialized properly and save that in the parent
    } else if (this.typeDef.extends) {
      // deal with string case - only valid for simple base types - `extends: 'number'`
      if (_.isString(this.typeDef.extends)) {
        if (!ConfigraphBaseTypes[this.typeDef.extends]) {
          throw new Error(`found invalid parent (string) in extends chain - "${this.typeDef.extends}"`);
        } else {
          this.parentType = ConfigraphBaseTypes[this.typeDef.extends](typeInstanceOptions as any);
        }
      // deal with uninitialized case - `extends: ConfigraphBaseTypes.number`
      } else if (_.isFunction(this.typeDef.extends)) {
        const initializedDataType = this.typeDef.extends(typeInstanceOptions as any);
        if (ConfigraphDataType.checkInstanceOf(initializedDataType)) {
          this.parentType = initializedDataType;
        } else {
          throw new Error('found invalid parent (as result of fn) in extends chain');
        }
      // normal case - `extends: ConfigraphBaseTypes.number({ ... })`
      } else if (ConfigraphDataType.checkInstanceOf(this.typeDef.extends)) {
        this.parentType = this.typeDef.extends;
      // anything else is considered an error
      } else if (this.typeDef.extends) {
        throw new Error(`found invalid parent in extends chain: ${this.typeDef.extends}`);
      }

    // if no parent type is set, we can try to infer it from a default value, and otherwise default to string
    } else {
      let inferredType;
      if (this.typeDef.value !== undefined) {
        if (_.isBoolean(this.typeDef.value)) inferredType = BooleanDataType();
        else if (_.isNumber(this.typeDef.value)) inferredType = NumberDataType();
      }
      // TODO: can probably attempt to infer type from certain kinds of resolver (like a switch)

      this.parentType = inferredType || StringDataType({});
    }

    // value resolvers have shorthands that can be passed in (static value, functions)
    // so we'll make sure those are initialized properly as well
    if ('value' in this.typeDef) {
      this._valueResolver = processInlineResolverDef(this.typeDef.value);
    }
  }

  get valueResolver(): ConfigValueResolver | undefined {
    return this._valueResolver ?? this.parentType?.valueResolver;
  }


  validate(val: any, ctx?: ResolverContext): true | Array<ValidationError> {
    // first we'll deal with empty values, and we'll check al
    // we'll check all the way up the chain for required setting and deal with that first
    if (
      val === undefined
      || val === null
    ) {
      if (this.required) {
        // we pass through the value so we know which "empty" it is
        return [new EmptyRequiredValueError(val)];
      } else {
        // maybe want to return something else than true?
        return true;
      }
    }

    // call parent validation (which will go all the way up the chain)
    // this can be disabled or moved to after but the `runParentValidate` setting
    if (
      this.parentType
      && (this.typeDef.runParentValidate === 'before' || this.typeDef.runParentValidate === undefined)
    ) {
      const parentValidationResult = this.parentType?.validate(val);
      if (_.isArray(parentValidationResult) && parentValidationResult.length > 0) {
        return parentValidationResult;
      }
    }

    if (this.typeDef.validate !== undefined) {
      try {
        // attaching `this` properly allows the validator to access type isntance settings if applicable/necessary
        const validationResult = this.typeDef.validate.call(this, val, ctx);

        // TODO: think through validation fn shape - how to return status and errors...
        if (
          validationResult === undefined
          || validationResult === true
          || (_.isArray(validationResult) && validationResult.length === 0)
        ) {
          // do nothing
        } else if (validationResult instanceof ValidationError) {
          return [validationResult];
        } else if (validationResult instanceof Error) {
          return [new ValidationError(validationResult)];
        } else if (_.isArray(validationResult) && validationResult[0] instanceof Error) {
          return _.map(validationResult, (e) => {
            if (e instanceof ValidationError) return e;
            if (e instanceof Error) return new ValidationError(e);
            return new ValidationError(new Error(`Threw invalid error: ${e}`));
          });
        } else {
          return [new ValidationError(new Error(`Validation returned invalid result: ${validationResult}`))];
        }
      } catch (err) {
        if (err instanceof ValidationError) {
          return [err];
        } else if (err instanceof Error) {
          return [new ValidationError(err)];
        } else if (_.isArray(err) && err[0] instanceof Error) {
          return _.map(err, (e) => {
            if (e instanceof ValidationError) return e;
            if (e instanceof Error) return new ValidationError(e);
            return new ValidationError(new Error(`Threw invalid error: ${e}`));
          });
        } else {
          return [new ValidationError(new Error(`Validation threw a non-error: ${err}`))];
        }
      }
    }

    // handle parent validation in "after" mode
    if (
      this.parentType
      && (this.typeDef.runParentValidate === 'after')
    ) {
      const parentValidationResult = this.parentType?.validate(val);
      if (_.isArray(parentValidationResult) && parentValidationResult.length > 0) {
        return parentValidationResult;
      }
    }

    return true;
  }


  // TODO: DRY this up - its (almost) exactly the same as the validate method but calling asyncValidate instead
  async asyncValidate(val: any, ctx?: ResolverContext): Promise<true | Array<Error>> {
    // we'll first check if the value is "valid" - which will also deal with required but empty values
    const isValid = this.validate(val, ctx);
    if (!isValid) return [new Error('Cannot run async validation check on an invalid value')];


    // TODO: not sure if we want to run the async validation if the value is empty?
    // maybe want to return something else than true?
    if (val === undefined || val === null) {
      return true;
    }

    if (
      this.parentType
      && (this.typeDef.runParentAsyncValidate === 'before' || this.typeDef.runParentAsyncValidate === undefined)
    ) {
      const parentValidationResult = await this.parentType?.asyncValidate(val);
      if (_.isArray(parentValidationResult) && parentValidationResult.length > 0) {
        return parentValidationResult;
      }
    }

    if (this.typeDef.asyncValidate !== undefined) {
      try {
        // we can identify the schema-defined types by not having a typeFactoryFn set
        // and the validation/coercion logic set there expects a resolver context, not a settings object
        // TODO: see if theres a better way to deal with TS for this?
        const validationResult = await this.typeDef.asyncValidate.call(this, val, ctx);

        // TODO: think through validation fn shape - how to return status and errors...
        if (
          validationResult === undefined
          || validationResult === true
          || (_.isArray(validationResult) && validationResult.length === 0)
        ) {
          // do nothing
        } else if (validationResult instanceof Error) {
          return [validationResult];
        } else if (_.isArray(validationResult) && validationResult[0] instanceof Error) {
          // TODO: might want to verify all array items are errors...?
          return validationResult;
        } else {
          return [new Error(`Validation returned invalid result: ${validationResult}`)];
        }
      } catch (err) {
        if (err instanceof Error) {
          return [err];
        } else if (_.isArray(err)) {
          // TODO: should probably check that its an array of errors?
          return err as Array<Error>;
        } else {
          return [new Error(`Validation threw a non-error: ${err}`)];
        }
      }
    }

    // handle parent validation in "after" mode
    if (
      this.parentType
      && (this.typeDef.runParentAsyncValidate === 'after')
    ) {
      const parentValidationResult = await this.parentType?.asyncValidate(val);
      if (_.isArray(parentValidationResult) && parentValidationResult.length > 0) {
        return parentValidationResult;
      }
    }

    return true;
  }

  coerce(val: any, ctx?: ResolverContext): any | CoercionError {
    let coercedVal = val;

    if (
      this.parentType
      && (this.typeDef.runParentCoerce === 'before' || this.typeDef.runParentCoerce === undefined)
    ) {
      coercedVal = this.parentType.coerce(coercedVal, ctx);
    }

    if (this.typeDef.coerce !== undefined) {
      // see note about ctx and any in `validate` above
      try {
        coercedVal = this.typeDef.coerce.call(this, coercedVal, ctx);
      } catch (err) {
        if (err instanceof CoercionError) {
          return err;
        } else if (err instanceof Error) {
          return new CoercionError(err);
        } else {
          return new CoercionError(new Error(`Coerce threw a non-error: ${err}`));
        }
      }
    }

    if (
      this.parentType
      && (this.typeDef.runParentCoerce === 'after')
    ) {
      coercedVal = this.parentType.coerce(coercedVal, ctx);
    }

    return coercedVal;
  }


  /** helper to unroll config schema using the type chain of parent "extends"  */
  private getDefItem<T extends keyof ConfigraphDataTypeDefinition<InstanceOptions, Metadata>>(
    key: T,
    opts?: {
      mergeArray?: boolean,
      inherit?: false,
    },
  ): ConfigraphDataTypeDefinition<InstanceOptions, Metadata>[T] | undefined {
    // in mergeArray mode, we'll merge all values found in the ancestor chain into a single array
    if (opts?.mergeArray) {
      if (this.typeDef[key] === undefined) {
        return this.parentType?.getDefItem(key, opts);
      } else {
        const parentItemVal = this.parentType?.getDefItem(key, opts);

        // TODO: remove this any... but might be impossible
        return [
          ..._.castArray(this.typeDef[key]),
          ...(parentItemVal ? _.castArray(parentItemVal) : []),
        ] as any;
      }
    }

    // first check if the item definition itself has a value
    if (this.typeDef[key] !== undefined) {
      return this.typeDef[key];
    // otherwise run up the ancestor heirarchy
    } else {
      // if `inherit: false` is enabled, we only check the parent if this is an inline defined type
      if (opts?.inherit === false && !this.isInlineDefinedType) {
        return undefined;
      }
      return this.parentType?.getDefItem(key, opts);
    }
  }

  get summary() { return this.getDefItem('summary'); }
  get description() { return this.getDefItem('description'); }
  get expose() { return this.getDefItem('expose'); }
  get typeLabel() { return this.getDefItem('typeLabel'); } // little special since it only exists on reusable types
  get typeDescription() { return this.getDefItem('typeDescription'); }
  get exampleValue() { return this.getDefItem('exampleValue'); }
  get externalDocs() {
    return this.getDefItem('externalDocs', { mergeArray: true }) as Array<ExternalDocsEntry> | undefined;
  }
  get ui() { return this.getDefItem('ui'); }
  get required() { return this.getDefItem('required'); }

  getMetadata<K extends keyof Metadata>(key: K): Metadata[K] | undefined {
    return this.getDefItem(key);
  }

  // this would be defined on a _type_ to tell it this type is not injectable
  // TODO: think through `provide: false` which would be defined on an _item_
  get injectable() {
    // our primitive types are not ever injectable
    return this.getDefItem('injectable', { inherit: false });
  }

  /** checks if this data type is directly an instance of the data type (not via inheritance) */
  isType(factoryFn: ConfigraphDataTypeFactoryFn<any, any> | typeof ObjectDataType): boolean {
    if (factoryFn === ObjectDataType) return this.isType(_RawObjectDataType);
    // we jump straight to the parent if we are dealing with an inline defined type
    return this.typeFactoryFn === factoryFn;
  }

  /** getter to retrieve the last type in the chain */
  get typeFactoryFn(): ConfigraphDataTypeFactoryFn<any, any> {
    if (this._typeFactoryFn) return this._typeFactoryFn;

    // if this was created inline, we have no type factory fn so we return the parent instead
    if (!this.parentType) throw new Error('inline defined types must have a parent');
    // if (this.parentType.typeFactoryFn) throw new Error('inline defined type parent must have a typeFactoryFn set');
    return this.parentType.typeFactoryFn;
  }

  /** checks if this data type is an instance of the data type, whether directly or via inheritance */
  extendsType(factoryFn: ConfigraphDataTypeFactoryFn<any, any> | typeof ObjectDataType): boolean {
    if (factoryFn === ObjectDataType) return this.extendsType(_RawObjectDataType);
    // follows up the chain checking for the type we passed in
    return this.isType(factoryFn) || this.parentType?.extendsType(factoryFn) || false;
  }

  /** helper to determine if the type was defined inline in a schema */
  get isInlineDefinedType() {
    // these get initialized without passing in a typeFactoryFn
    return !this._typeFactoryFn;
  }

  // TODO: these names need to be thought through...
  get primitiveType(): ConfigraphDataType {
    if (!this.parentType) {
      if (this.typeDef.extends === PrimitiveBaseType) return this;
      throw new Error('Only primitive types should have no parent type');
    }
    return this.parentType?.primitiveType;
  }
  get primitiveTypeFactory(): ConfigraphDataTypeFactoryFn<any, any> {
    return this.primitiveType.typeFactoryFn!;
  }

  toJSON(): SerializedConfigraphDataType {
    return {
      summary: this.summary,
      description: this.description,
      typeDescription: this.typeDescription,
      expose: this.expose,
      externalDocs: this.externalDocs,
      ui: this.ui,
      required: this.required,
    };
  }
}


// abusing a class here to be able to attach the additional type argument
// which is necessary to be able define a new type registry for types with extra metadata
export class ConfigraphDataTypesRegistry<Metadata = {}> {
  // eslint-disable-next-line class-methods-use-this
  create<TypeSettings = {}>(
    opts: ConfigraphDataTypeDefinition<TypeSettings, Metadata>,
  ): ConfigraphDataTypeFactoryFn<TypeSettings, Metadata> {
    const typeRegistry = this;
    const typeFactoryFn = (usageOpts?: TypeSettings) => (
      new ConfigraphDataType<TypeSettings, Metadata>(
        opts,
        usageOpts ?? {} as TypeSettings,
        typeFactoryFn,
        typeRegistry,
      )
    );
    return typeFactoryFn;
  }
}
export const createConfigraphDataType = (new ConfigraphDataTypesRegistry()).create;



// we'll use this type to mark our primitive types in a way that end users can't do by accident
const PrimitiveBaseType = createConfigraphDataType({ typeLabel: 'dmno/primitive' });

/**
 * String base type settings
 * @category BaseTypes
 */
export type StringDataTypeSettings = {
  /** The minimum length of the string. */
  minLength?: number;
  /** The maximum length of the string. */
  maxLength?: number;
  /** The exact length of the string. */
  isLength?: number;
  /** The required starting substring of the string. */
  startsWith?: string;
  /** The required ending substring of the string. */
  endsWith?: string;

  /** The regular expression or string pattern that the string must match. */
  matches?: RegExp | string;
  // isUpperCase?: boolean;
  // isLowerCase?: boolean;
  // isAlphaNumeric?: boolean;

  // allow/deny character list
  // more stuff?
  /** converts to upper case */
  toUpperCase?: boolean;
  /** converts to lower case */
  toLowerCase?: boolean;

  /** allow empty string as a valid string (default is to NOT allow it) */
  allowEmpty?: boolean;
};

/**
 * Represents a generic string data type.
 * @category Base Types
 */
const StringDataType = createConfigraphDataType<StringDataTypeSettings>({
  typeLabel: 'dmno/string',
  extends: PrimitiveBaseType,
  injectable: false,
  ui: { icon: 'carbon:string-text' },

  coerce(rawVal) {
    const settings = this.typeInstanceOptions;
    if (_.isNil(rawVal)) return undefined;
    let val = _.isString(rawVal) ? rawVal : rawVal.toString();

    if (settings?.toUpperCase) val = val.toUpperCase();
    if (settings?.toLowerCase) val = val.toLowerCase();

    return val;
  },

  validate(val: string) {
    const settings = this.typeInstanceOptions;
    // we support returning multiple errors and our base types use this pattern
    // but many user defined types should just throw the first error they encounter
    const errors = [] as Array<ValidationError>;

    // special handling to not allow empty strings (unless explicitly allowed)
    if (val === '' && !settings?.allowEmpty) {
      return [new ValidationError('If set, string must not be empty')];
    }

    if (settings?.minLength !== undefined && val.length < settings.minLength) {
      errors.push(new ValidationError(`Length must be more than ${settings.minLength}`));
    }
    if (settings?.maxLength !== undefined && val.length > settings.maxLength) {
      errors.push(new ValidationError(`Length must be less than ${settings.maxLength}`));
    }
    if (settings?.isLength !== undefined && val.length !== settings.isLength) {
      errors.push(new ValidationError(`Length must be exactly ${settings.isLength}`));
    }

    if (settings?.startsWith && !val.startsWith(settings.startsWith)) {
      errors.push(new ValidationError(`Value must start with "${settings.startsWith}"`));
    }
    if (settings?.endsWith && !val.endsWith(settings.endsWith)) {
      errors.push(new ValidationError(`Value must start with "${settings.endsWith}"`));
    }

    if (settings?.matches) {
      const regex = _.isString(settings.matches) ? new RegExp(settings.matches) : settings.matches;
      const matches = val.match(regex);
      if (!matches) {
        errors.push(new ValidationError(`Value must match regex "${settings.matches}"`));
      }
    }
    return errors.length ? errors : true;
  },
});

/**
 * Represents the settings for the NumberDataType.
 * @category BaseTypes
 */
export type NumberDataTypeSettings = {
  /** minimum value allowed for the number */
  min?: number;
  /** maximum value allowed for the number */
  max?: number;
  /** enables coercion of the value to be within the min/max range */
  coerceToMinMaxRange?: boolean;
  /** checks if value is divisible by this number */
  isDivisibleBy?: number;
} & (
  {
    /** checks if it's an integer */
    isInt: true;
  } | {
    isInt?: never;
    /** The number of decimal places allowed (for non-integers) */
    precision?: number
  }
);

/**
 * Represents a generic number data type.
 * @category Base Types
 */
const NumberDataType = createConfigraphDataType<NumberDataTypeSettings>({
  typeLabel: 'dmno/number',
  extends: PrimitiveBaseType,
  injectable: false,
  ui: { icon: 'carbon:string-integer' },
  validate(val) {
    const settings = this.typeInstanceOptions || {};
    const errors = [] as Array<ValidationError>;
    if (settings.min !== undefined && val < settings.min) {
      errors.push(new ValidationError(`Min value is ${settings.min}`));
    }
    if (settings.max !== undefined && val > settings.max) {
      errors.push(new ValidationError(`Max value is ${settings.max}`));
    }
    if (settings.isDivisibleBy !== undefined && val % settings.isDivisibleBy !== 0) {
      errors.push(new ValidationError(`Value must be divisible by ${settings.isDivisibleBy}`));
    }
    return errors.length ? errors : true;
  },
  coerce(val) {
    const settings = this.typeInstanceOptions || {};
    let numVal!: number;
    if (_.isString(val)) {
      const parsed = parseFloat(val);
      if (_.isNaN(parsed)) throw new CoercionError('Unable to coerce string to number');
      numVal = parsed;
    } else if (_.isFinite(val)) {
      numVal = val;
    } else {
      throw new CoercionError(`Cannot convert ${val} to number`);
    }

    if (settings.coerceToMinMaxRange) {
      if (settings.min !== undefined) numVal = Math.max(settings.min, numVal);
      if (settings.max !== undefined) numVal = Math.min(settings.max, numVal);
    }

    // not sure if we want to coerce to integer by default, versus just checking
    if (settings.isInt === true || settings.precision === 0) {
      numVal = Math.round(numVal);
    } else if (settings.precision) {
      const p = 10 ** settings.precision;
      numVal = Math.round(numVal * p) / p;
    }
    return numVal;
  },
});


const BooleanDataType = createConfigraphDataType({
  typeLabel: 'dmno/boolean',
  extends: PrimitiveBaseType,
  injectable: false,
  ui: { icon: 'carbon:boolean' },
  // TODO: add settings to be more strict, or to allow other values to coerce to true/false
  validate(val) {
    if (_.isBoolean(val)) return true;
    return new ValidationError('Value must be `true` or `false`');
  },
  coerce(val) {
    if (_.isBoolean(val)) {
      return val;
    } else if (_.isString(val)) {
      const cleanVal = val.toLowerCase().trim();
      if (['t', 'true', 'yes', 'on', '1'].includes(cleanVal)) return true;
      if (['f', 'false', 'no', 'off', '0'].includes(cleanVal)) return false;
      throw new CoercionError('Unable to coerce string value to boolean');
    } else if (_.isFinite(val)) {
      if (val === 0) return false;
      if (val === 1) return true;
      throw new CoercionError('Unable to coerce number value to boolean (only 0 or 1 is valid)');
    } else {
      throw new CoercionError('Unable to coerce value to boolean');
    }
  },
});


// Common utility types ///////////////////////////////////////////////////////////////

const URL_REGEX = /(?:^|\s)((https?:\/\/)?(?:localhost|[\w-]+(?:\.[\w-]+)+)(:\d+)?(\/\S*)?)/;
// swapped to above to allow localhost
// /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;
const UrlDataType = createConfigraphDataType<{
  prependProtocol?: boolean
  normalize?: boolean,
  allowedDomains?: Array<string>
}>({
  typeLabel: 'dmno/url',
  extends: (settings) => StringDataType({
    ...settings?.normalize && { toLowerCase: true },
  }),
  injectable: false,
  ui: { icon: 'carbon:url' },
  typeDescription: 'standard URL',
  coerce(rawVal) {
    const settings = this.typeInstanceOptions;
    if (settings?.prependProtocol && !rawVal.startsWith('https://')) {
      return `https://${rawVal}`;
    }
    return rawVal;
  },

  validate(val) {
    const settings = this.typeInstanceOptions;
    // TODO: this is testing assuming its a normal web/http URL
    // we'll want some options to enable/disable specific protocols and things like that...
    // at the very least, need to consider allowing localhost, which should likely be an option
    const result = URL_REGEX.test(val);
    if (!result) return new ValidationError('URL doesnt match url regex check');
    if (settings?.allowedDomains) {
      const [_protocol, , domain] = val.split('/');
      if (!settings.allowedDomains.includes(domain.toLowerCase())) {
        return new ValidationError(`Domain (${domain}) is not in allowed list: ${settings.allowedDomains.join(',')}`);
      }
    }
    return true;
  },
});


const SimpleObjectDataType = createConfigraphDataType({
  typeLabel: 'dmno/simple-object',
  extends: PrimitiveBaseType,
  injectable: false,
  ui: { icon: 'tabler:code-dots' }, // curly brackets with nothing inside
  validate(val) {
    if (_.isPlainObject(val)) return true;
    return new ValidationError('Value must be an object');
  },
  coerce(val) {
    if (_.isPlainObject(val)) return val;
    // if value is a string, we'll try to JSON.parse and see if that is an object
    if (_.isString(val)) {
      try {
        const parsedObj = JSON.parse(val);
        if (_.isPlainObject(parsedObj)) return parsedObj;
        return new CoercionError('Unable to coerce JSON parsed string to object');
      } catch (err) {
        return new CoercionError('Error parsing JSON string while coercing string to object');
      }
    }
    return new CoercionError('Cannot coerce value to object');
  },
});



// Complex "container" types //////////////////////////////////////////////////////////
type ObjectDataTypeSettings = {
  children: Record<string, ConfigraphDataTypeDefinitionOrShorthand>,
  allowEmpty?: boolean,
};

const _RawObjectDataType = createConfigraphDataType<ObjectDataTypeSettings>({
  typeLabel: 'dmno/object',
  extends: PrimitiveBaseType,
  injectable: false,
  ui: { icon: 'tabler:code-dots' }, // this one has 3 dots inside brackets, vs simple object is only brackets
  coerce(val) {
    if (_.isPlainObject(val)) return val;
    if (!_.isString(val)) {
      return new CoercionError('Only strings can be coerced into objects via JSON.parse');
    }
    try {
      const parsed = JSON.parse(val);
      if (_.isPlainObject(val)) return parsed;
      return new CoercionError('String passed JSON.parse but is not an object');
    } catch (err) {
      return new CoercionError('String was unable to JSON.parse');
    }
  },
  validate(val) {
    const settings = this.typeInstanceOptions;
    // special handling to not allow empty strings (unless explicitly allowed)
    if (_.isEmpty(val) && !settings?.allowEmpty) {
      return [new ValidationError('If set, object must not be empty')];
    }
    return true;
  },
});
const ObjectDataType = (
  childrenSchema: ObjectDataTypeSettings['children'],
  otherSettings?: Omit<ObjectDataTypeSettings, 'children'>,
) => _RawObjectDataType({ children: childrenSchema, ...otherSettings });


/**
 * Represents the settings for the ArrayDataType.
 * @category BaseTypes
 */
export type ArrayDataTypeSettings = {
  /**
   * The schema definition for each item in the array.
   */
  itemSchema?: ConfigraphDataTypeDefinitionOrShorthand;

  /**
   * The minimum length of the array.
   */
  minLength?: number;

  /**
   * The maximum length of the array.
   */
  maxLength?: number;

  /**
   * The exact length of the array.
   */
  isLength?: number;
};
const ArrayDataType = createConfigraphDataType<ArrayDataTypeSettings>({
  typeLabel: 'dmno/array',
  extends: PrimitiveBaseType,
  injectable: false,
  ui: { icon: 'tabler:brackets' }, // square brackets
  // TODO: validate checks if it's an array
  // helper to coerce csv string into array of strings
});


/**
 * Represents the settings for the DictionaryDataType.
 * @category BaseTypes
 */
export type DictionaryDataTypeSettings = {
  /**
   * The schema definition for each item in the dictionary.
   */
  itemSchema?: ConfigraphDataTypeDefinitionOrShorthand;

  /**
   * The minimum number of items in the dictionary.
   */
  minItems?: number;

  /**
   * The maximum number of items in the dictionary.
   */
  maxItems?: number;

  /**
   * A function to validate the keys of the dictionary.
   */
  validateKeys?: (key: string) => boolean;

  /**
   * A function to asynchronously validate the keys of the dictionary.
   */
  asyncValidateKeys?: (key: string) => Promise<boolean>;

  /**
   * A description of the keys of the dictionary.
   */
  keyDescription?: string;
};
const DictionaryDataType = createConfigraphDataType<DictionaryDataTypeSettings>({
  typeLabel: 'dmno/dictionary',
  extends: PrimitiveBaseType,
  injectable: false,
  ui: { icon: 'tabler:code-asterisk' }, // curly brackets with an asterisk inside
  // TODO: validate checks if it's an object

});

type PossibleEnumValues = string | number | boolean; // do we need explicitly allow null/undefined?
type ExtendedEnumDescription = {
  value: PossibleEnumValues,
  description?: string,
  // icon, color, docs url, etc...
};

type EnumDataTypeSettings = (
  // simple list of values
  Array<PossibleEnumValues>
  // array or values with extra metadata
  | Array<ExtendedEnumDescription>
  // object where object keys are the possible enum values and object values are additional metadata (works for strings only)
  | Record<string, Omit<ExtendedEnumDescription, 'value'>>
);

const EnumDataType = createConfigraphDataType<EnumDataTypeSettings>({
  typeLabel: 'dmno/enum',
  extends: PrimitiveBaseType,
  injectable: false,
  ui: { icon: 'material-symbols-light:category' }, // a few shapes... not sure about this one
  validate(val) {
    const settings = this.typeInstanceOptions;
    let possibleValues: Array<any>;
    if (_.isPlainObject(settings)) {
      possibleValues = _.keys(settings);
    } else if (_.isArray(settings)) {
      if (_.isObject(settings[0]) && 'value' in settings[0]) {
        possibleValues = _.map(settings, (i) => (i as any).value);
      } else {
        possibleValues = settings;
      }
    }
    possibleValues ||= [];
    if (!possibleValues.includes(val)) {
      throw new ValidationError('Current value is not in list of possible values', {
        tip: `Possible values are: "${possibleValues.join('", "')}"`,
      });
    }
  },
});

const EMAIL_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const EmailDataType = createConfigraphDataType<{
  normalize?: boolean,
}>({
  typeLabel: 'dmno/email',
  extends: (settings) => StringDataType({
    ...settings?.normalize && { toLowerCase: true },
  }),
  injectable: false,
  ui: { icon: 'iconoir:at-sign' },
  typeDescription: 'standard email address',
  validate(val) {
    // check if it's a valid email
    const result = EMAIL_REGEX.test(val);
    if (result) return true;
    return new ValidationError('Value must be a valid email address');
  },
});

const IP_V4_ADDRESS_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
const IP_V6_ADDRESS_REGEX = /^(?:(?:[a-fA-F\d]{1,4}:){7}(?:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,2}|:)|(?:[a-fA-F\d]{1,4}:){4}(?:(?::[a-fA-F\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,3}|:)|(?:[a-fA-F\d]{1,4}:){3}(?:(?::[a-fA-F\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,4}|:)|(?:[a-fA-F\d]{1,4}:){2}(?:(?::[a-fA-F\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,5}|:)|(?:[a-fA-F\d]{1,4}:){1}(?:(?::[a-fA-F\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,6}|:)|(?::(?:(?::[a-fA-F\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,7}|:)))(?:%[0-9a-zA-Z]{1,})?$/;
const ipAddressDataType = createConfigraphDataType<{
  version?: 4 | 6,
  normalize?: boolean,
}>({
  typeLabel: 'dmno/ipAddress',
  extends: (settings) => StringDataType({
    ...settings?.normalize && { toLowerCase: true },
  }),
  injectable: false,
  ui: { icon: 'iconoir:ip-address-tag' },
  typeDescription: 'ip v4 or v6 address',
  validate(val) {
    const settings = this.typeInstanceOptions;
    // default to v4
    const regex = settings?.version === 6 ? IP_V6_ADDRESS_REGEX : IP_V4_ADDRESS_REGEX;
    const result = regex.test(val);
    if (result) return true;
    return new ValidationError('Value must be a valid IP address');
  },
});

const PortDataType = createConfigraphDataType({
  typeLabel: 'dmno/port',
  extends: NumberDataType({
    min: 0,
    max: 65535,
  }),
  injectable: false,
  ui: { icon: 'material-symbols:captive-portal' }, //! globe with arrow - not sure about this one
  typeDescription: 'valid port number between 0 and 65535',
  validate(val) {
    if (val >= 0 && val <= 65535) return true;
    return new ValidationError('Value must be a valid port number (0-65535)');
  },
});

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
const SemverDataType = createConfigraphDataType<{
  normalize?: boolean,
  // range?: string, // ex.
}>({
  typeLabel: 'dmno/semver',
  extends: (settings) => StringDataType({
    ...settings?.normalize && { toLowerCase: true },
  }),
  injectable: false,
  ui: { icon: 'simple-icons:semver' },
  typeDescription: 'semantic version string',
  validate(val) {
    const result = SEMVER_REGEX.test(val);
    if (result) return true;
    return new ValidationError('Value must be a valid semantic version string');
  },
});

// https://rgxdb.com/r/526K7G5W
const ISO_DATE_REGEX = /^(?:[+-]?\d{4}(?!\d{2}\b))(?:(-?)(?:(?:0[1-9]|1[0-2])(?:\1(?:[12]\d|0[1-9]|3[01]))?|W(?:[0-4]\d|5[0-2])(?:-?[1-7])?|(?:00[1-9]|0[1-9]\d|[12]\d{2}|3(?:[0-5]\d|6[1-6])))(?:[T\s](?:(?:(?:[01]\d|2[0-3])(?:(:?)[0-5]\d)?|24:?00)(?:[.,]\d+(?!:))?)?(?:\2[0-5]\d(?:[.,]\d+)?)?(?:[zZ]|(?:[+-])(?:[01]\d|2[0-3]):?(?:[0-5]\d)?)?)?)?$/;
const IsoDateDataType = createConfigraphDataType({
  typeLabel: 'dmno/isoDate',
  extends: StringDataType,
  injectable: false,
  ui: { icon: 'formkit:datetime' },
  typeDescription: 'ISO 8601 date string with optional time and milliseconds',
  validate(val) {
    const result = ISO_DATE_REGEX.test(val);
    if (result) return true;
    return new ValidationError('Value must be a valid ISO 8601 date string');
  },
});


const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UuidDataType = createConfigraphDataType({
  typeLabel: 'dmno/uuid',
  extends: StringDataType,
  injectable: false,
  ui: { icon: 'mdi:identifier' },
  typeDescription: 'UUID string V1-V5 per RFC4122, including NIL',
  validate(val) {
    const result = UUID_REGEX.test(val);
    if (result) return true;
    return new ValidationError('Value must be a valid UUID string');
  },
});

const MD5_REGEX = /^[a-f0-9]{32}$/;
const Md5DataType = createConfigraphDataType({
  typeLabel: 'dmno/md5',
  extends: StringDataType,
  injectable: false,
  typeDescription: 'MD5 hash string',
  validate(val) {
    const result = MD5_REGEX.test(val);
    if (result) return true;
    return new ValidationError('Value must be a valid MD5 hash string');
  },
});


// TODO consider splitting into base and utility types
export const ConfigraphBaseTypes = {
  string: StringDataType,
  number: NumberDataType,
  boolean: BooleanDataType,
  simpleObject: SimpleObjectDataType,

  enum: EnumDataType,
  email: EmailDataType,
  url: UrlDataType,
  ipAddress: ipAddressDataType,
  port: PortDataType,
  semver: SemverDataType,
  isoDate: IsoDateDataType,
  uuid: UuidDataType,
  md5: Md5DataType,

  // TODO
  // locale
  // iso 3166

  // "compound" types /////////////////
  object: ObjectDataType,
  array: ArrayDataType,
  dictionary: DictionaryDataType, // TODO: could be called record? something else?
};

// cannot use `keyof typeof ConfigraphBaseTypes` as it creates a circular reference...
// so we'll list the basic types that are valid to use without any options
export type ConfigraphSimpleBaseTypeNames = 'string' | 'number' | 'url' | 'boolean' | 'simpleObject';
