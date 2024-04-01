
import _ from 'lodash-es';
import {
  ConfigItemDefinition, ResolverContext, TypeValidationResult,
} from './config-engine';
import { ConfigValueResolver, processResolverDef } from './resolvers/resolvers';
import { CoercionError, EmptyRequiredValueError, ValidationError } from './errors';

// data types expose all the same options, except they additionally have a "settings schema"
// and their validations/normalize functions get passed in the _instance_ of those settings when invoked
/**
 * Represents the options for a DmnoDataType
 * @category HelperMethods
 */
type DmnoDataTypeOptions<TypeSettings = any> =
  // the schema item validation/normalize fns do not get passed any settings
  Omit<ConfigItemDefinition<TypeSettings>, 'validate' | 'asyncValidate' | 'coerce'> &
  {
    // TODO: we maybe want to split this into package/name or even org/package/name?
    // TODO: figure out naming conventions (camel? Pascal? camel `package/typeName`)
    /** type identifier used internally */
    typeLabel?: string,

    /** define a schema for the settings that will be passed in when using this data type */
    settingsSchema?: TypeSettings,

    /** validation function that can use type instance settings */
    validate?: (val: any, settings: TypeSettings, ctx?: ResolverContext) => TypeValidationResult;

    /** validation function that can use type instance settings */
    asyncValidate?: (val: any, settings: TypeSettings, ctx?: ResolverContext) => Promise<TypeValidationResult>;

    /** coerce function that can use type instance settings */
    coerce?: (val: any, settings: TypeSettings, ctx?: ResolverContext) => any;

    /** allows disabling or controling execution order of running the parent type's `validate` function (default = "before") */
    runParentValidate?: 'before' | 'after' | false;
    /** allows disabling or controling execution order of running the parent type's `asyncValidate` function (default = "before") */
    runParentAsyncValidate?: 'before' | 'after' | false;
    /** allows disabling or controling execution order of running the parent type's `coerce` function (default = "before") */
    runParentCoerce?: 'before' | 'after' | false;

  };

/**
 * data type factory function - which is the result of `createDmnoDataType`
 * This is the type of our base types and any custom types defined by the user
 * */
export type DmnoDataTypeFactoryFn<T> = ((opts?: T) => DmnoDataType<T>);
/**
 * utility type to extract the settings schema shape from a DmnoDataTypeFactoryFn (for example DmnoBaseTypes.string)
 * this is useful when extending types and wanting to reuse the existing settings
 * */
export type ExtractSettingsSchema<F> =
  F extends DmnoDataTypeFactoryFn<infer T> ? T : never;


export class DmnoDataType<InstanceOptions = any> {
  // NOTE - note quite sure about this setup yet...
  // but the idea is to provide a wrapped version of the validate/coerce (the fns that need the type instance options)
  // while providing transparent access to the rest. This is so the ConfigItem can just walk up the chain of types
  // without having to understand the details... The other option is to revert that change and

  parentType?: DmnoDataType;
  private _valueResolver?: ConfigValueResolver;

  constructor(
    readonly typeDef: DmnoDataTypeOptions<InstanceOptions>,
    readonly typeInstanceOptions: InstanceOptions,
    /**
     * the factory function that created this item
     * Should be always defined unless this is an inline defined type from a config schema
     * */
    private _typeFactoryFn?: DmnoDataTypeFactoryFn<InstanceOptions>,
  ) {
    // if this is already one of our primitive base types, we are done
    if (this.typeDef.extends === PrimitiveBaseType) {
      // we'll skip setting the parentType since the primitive base type is just a placeholder / marker

    // if extends is set, we make sure it is initialized properly and save that in the parent
    } else if (this.typeDef.extends) {
      // deal with string case - only valid for simple base types - `extends: 'number'`
      if (_.isString(this.typeDef.extends)) {
        if (!DmnoBaseTypes[this.typeDef.extends]) {
          throw new Error(`found invalid parent (string) in extends chain - "${this.typeDef.extends}"`);
        } else {
          this.parentType = DmnoBaseTypes[this.typeDef.extends](typeInstanceOptions as any);
        }
      // deal with uninitialized case - `extends: DmnoBaseTypes.number`
      } else if (_.isFunction(this.typeDef.extends)) {
        const initializedDataType = this.typeDef.extends(typeInstanceOptions as any);
        if (initializedDataType instanceof DmnoDataType) {
          this.parentType = initializedDataType;
        } else {
          console.log(initializedDataType);
          throw new Error('found invalid parent (as result of fn) in extends chain');
        }
      // normal case - `extends: DmnoBaseTypes.number({ ... })`
      } else if (this.typeDef.extends instanceof DmnoDataType) {
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
    if (this.typeDef.value !== undefined) {
      this._valueResolver = processResolverDef(this.typeDef.value);
    }

    // if we are dealing with one of our schema inline-defined types (instead of via a reusable data type)
    // we must adjust validate/coerce functions because they do not accept any settings
    if (this.isInlineDefinedType) {
      if (this.typeDef.validate) {
        const originalValidate = this.typeDef.validate;
        this.typeDef.validate = (val, _settings, ctx) => (originalValidate as any)(val, ctx as any);
      }
      if (this.typeDef.asyncValidate) {
        const originalAsyncValidate = this.typeDef.asyncValidate;
        this.typeDef.asyncValidate = (val, _settings, ctx) => (originalAsyncValidate as any)(val, ctx as any);
      }
      if (this.typeDef.coerce) {
        const originalCoerce = this.typeDef.coerce;
        this.typeDef.coerce = (val, _settings, ctx) => (originalCoerce as any)(val, ctx as any);
      }
    }
  }

  get valueResolver(): ConfigValueResolver | undefined {
    return this._valueResolver ?? this.parentType?.valueResolver;
  }


  validate(val: any, ctx?: ResolverContext): true | Array<ValidationError> {
    // first we'll deal with empty values, and we'll check al
    // we'll check all the way up the chain for required setting and deal with that first
    if (val === undefined || val === null || val === '') {
      if (this.getDefItem('required')) {
        // maybe pass through the value so we know which "empty" it is?
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
        // we can identify the schema-defined types by not having a typeFactoryFn set
        // and the validation/coercion logic set there expects a resolver context, not a settings object
        // TODO: see if theres a better way to deal with TS for this?
        const validationResult = this.typeDef.validate(val, this.typeInstanceOptions, ctx);

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
    if (val === undefined || val === null || val === '') {
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
        const validationResult = await this.typeDef.asyncValidate(val, this.typeInstanceOptions, ctx);

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
        coercedVal = this.typeDef.coerce(coercedVal, this.typeInstanceOptions, ctx);
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
  getDefItem<T extends keyof DmnoDataTypeOptions>(key: T): DmnoDataTypeOptions[T] {
    // first check if the item definition itself has a value
    if (this.typeDef[key] !== undefined) {
      return this.typeDef[key];
    // otherwise run up the ancestor heirarchy
    } else {
      return this.parentType?.getDefItem(key);
    }
  }


  /** checks if this data type is directly an instance of the data type (not via inheritance) */
  isType(factoryFn: DmnoDataTypeFactoryFn<any>): boolean {
    // we jump straight to the parent if we are dealing with an inline defined type
    return this.typeFactoryFn === factoryFn;
  }

  /** getter to retrieve the last type in the chain */
  get typeFactoryFn(): DmnoDataTypeFactoryFn<any> {
    if (this._typeFactoryFn) return this._typeFactoryFn;

    // if this was created inline, we have no type factory fn so we return the parent instead
    if (!this.parentType) throw new Error('inline defined types must have a parent');
    // if (this.parentType.typeFactoryFn) throw new Error('inline defined type parent must have a typeFactoryFn set');
    return this.parentType.typeFactoryFn;
  }

  /** checks if this data type is an instance of the data type, whether directly or via inheritance */
  extendsType(factoryFn: DmnoDataTypeFactoryFn<any>): boolean {
    // follows up the chain checking for the type we passed in
    return this.isType(factoryFn) || this.parentType?.extendsType(factoryFn) || false;
  }

  /** helper to determine if the type was defined inline in a schema */
  get isInlineDefinedType() {
    // these get initialized without passing in a typeFactoryFn
    return !this._typeFactoryFn;
  }

  // TODO: these names need to be thought through...
  get primitiveType(): DmnoDataType {
    if (!this.parentType) {
      if (this.typeDef.extends === PrimitiveBaseType) return this;
      throw new Error('Only primitive types should have no parent type');
    }
    return this.parentType?.primitiveType;
  }
  get primitiveTypeFactory(): DmnoDataTypeFactoryFn<any> {
    return this.primitiveType.typeFactoryFn!;
  }
}


// TODO: figure this out
// when using a type, ideally we could omit usage options only when the schema has been mareked as `undefined | {}...`
// alternatively, we can force the user to write it a certain way, but it's nice to be flexible
// note that we have allowed the bare (non-function call, ie `extends: DmnoBaseTypes.string`) which
// is also unaware if the settings schema is able to be undefined or not
// (we're talking about allowing `DmnoBaseTypes.string()` vs only `DmnoBaseTypes.string({})`)
export function createDmnoDataType<T>(opts: DmnoDataTypeOptions<T>): DmnoDataTypeFactoryFn<T> {
  // we are going to return a function which takes an _instance_ of the type settings schema for example `{ minLength: 2 }`
  // and returns something which is able to use the DmnoDataType which knows how to combine the data type defintition and that isntance
  // of the options together

  // by storing a reference to this factory function we'll be able to compare a usage of the data type to the "type" itself
  // for example `myCustomStringType.isType(DmnoBaseTypes.string)`
  const typeFactoryFn = (usageOpts?: T) => new DmnoDataType<T>(opts, usageOpts ?? {} as T, typeFactoryFn);
  return typeFactoryFn;
}


// we'll use this to mark our primitive types in a way that end users can't do by accident
const PrimitiveBaseType = createDmnoDataType({});

/** String base type settings
 * @category BaseTypes
 */
export type StringDataTypeSettings = {
  /**
     * The minimum length of the string.
     */
  minLength?: number;
  /**
     * The maximum length of the string.
     */
  maxLength?: number;
  /**
     * The exact length of the string.
     */
  isLength?: number;
  /**
     * The required starting substring of the string.
     */
  startsWith?: string;
  /**
     * The required ending substring of the string.
     */
  endsWith?: string;

  /**
     * The regular expression or string pattern that the string must match.
     */
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
};

/**
 * Represents a generic string data type.
 * @category Base Types
 */

const StringDataType = createDmnoDataType({
  typeLabel: 'dmno/string',
  extends: PrimitiveBaseType,

  // summary: 'generic string data type',
  settingsSchema: Object as undefined | StringDataTypeSettings,

  coerce(rawVal, settings) {
    if (_.isNil(rawVal)) return '';
    let val = _.isString(rawVal) ? rawVal : rawVal.toString();

    if (settings?.toUpperCase) val = val.toUpperCase();
    if (settings?.toLowerCase) val = val.toLowerCase();

    return val;
  },

  validate(val: string, settings) {
    if (_.isEmpty(settings)) return true;

    // we support returning multiple errors and our base types use this pattern
    // but many user defined types should just throw the first error they encounter
    const errors = [] as Array<ValidationError>;
    if (settings.minLength !== undefined && val.length < settings.minLength) {
      errors.push(new ValidationError(`Length must be more than ${settings.minLength}`));
    }
    if (settings.maxLength !== undefined && val.length > settings.maxLength) {
      errors.push(new ValidationError(`Length must be less than ${settings.maxLength}`));
    }
    if (settings.isLength !== undefined && val.length !== settings.isLength) {
      errors.push(new ValidationError(`Length must be exactly ${settings.isLength}`));
    }

    if (settings.startsWith && !val.startsWith(settings.startsWith)) {
      errors.push(new ValidationError(`Value must start with "${settings.startsWith}"`));
    }
    if (settings.endsWith && !val.endsWith(settings.endsWith)) {
      errors.push(new ValidationError(`Value must start with "${settings.endsWith}"`));
    }

    if (settings.matches) {
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
  /**
   * The minimum value allowed for the number.
   */
  min?: number;
  /**
   * The maximum value allowed for the number.
   */
  max?: number;
  /**
   * Determines whether the number should be coerced to the minimum or maximum value if it is outside the range.
   */
  coerceToMinMaxRange?: boolean;
  /**
   * The number that the value must be divisible by.
   */
  isDivisibleBy?: number;
  /**
   * Determines whether the number should be an integer.
   */
  /** checks if it's an integer */
  isInt?: boolean;
  /** The number of decimal places allowed (for non-integers) */
  precision?: number
};
// TOOD ACTUALLY USE THIS TYPE

/**
 * Represents a generic number data type.
 * @category Base Types
 */
const NumberDataType = createDmnoDataType({
  typeLabel: 'dmno/number',
  extends: PrimitiveBaseType,
  settingsSchema: Object as undefined | {

    min?: number;
    max?: number;
    coerceToMinMaxRange?: boolean;
    isDivisibleBy?: number;
  } & ({ isInt: true; } | {
    isInt?: never;
    precision?: number
  }),
  validate(val, settings = {}) {
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
  coerce(val, settings = {}) {
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


const BooleanDataType = createDmnoDataType({
  typeLabel: 'dmno/boolean',
  extends: PrimitiveBaseType,
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

const URL_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;
const UrlDataType = createDmnoDataType({
  typeLabel: 'dmno/url',
  extends: (settings) => StringDataType({
    ...settings.normalize && { toLowerCase: true },
  }),
  typeDescription: 'standard URL',
  settingsSchema: Object as undefined | {
    prependProtocol?: boolean
    normalize?: boolean,
  },

  coerce(rawVal, settings) {
    if (settings?.prependProtocol && !rawVal.startsWith('https://')) {
      return `https://${rawVal}`;
    }
    return rawVal;
  },

  validate(val) {
    // TODO: this is testing assuming its a normal web/http URL
    // we'll want some options to enable/disable specific protocols and things like that...
    const result = URL_REGEX.test(val);
    if (result) return true;
    return new ValidationError('URL doesnt match url regex check');
  },
});



// Complex "container" types //////////////////////////////////////////////////////////

const ObjectDataType = createDmnoDataType({
  typeLabel: 'dmno/object',
  extends: PrimitiveBaseType,
  settingsSchema: Object as any as Record<string, ConfigItemDefinition>,
});

/**
 * Represents the settings for the ArrayDataType.
 * @category BaseTypes
 */
export type ArrayDataTypeSettings = {
  /**
   * The schema definition for each item in the array.
   */
  itemSchema?: ConfigItemDefinition;

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
const ArrayDataType = createDmnoDataType({
  typeLabel: 'dmno/array',
  extends: PrimitiveBaseType,
  settingsSchema: Array as ArrayDataTypeSettings,
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
  itemSchema?: ConfigItemDefinition;

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
const DictionaryDataType = createDmnoDataType({
  typeLabel: 'dmno/dictionary',
  extends: PrimitiveBaseType,
  settingsSchema: Object as DictionaryDataTypeSettings,
  // TODO: validate checks if it's an object

});

type PossibleEnumValues = string | number | boolean; // do we need explicitly allow null/undefined?
type ExtendedEnumDescription = {
  value: PossibleEnumValues,
  description?: string,
  // icon, color, docs url, etc...
};



const EnumDataType = createDmnoDataType({
  typeLabel: 'dmno/enum',
  extends: PrimitiveBaseType,
  settingsSchema: Object as any as
    (
      // simple list of values
      Array<PossibleEnumValues>
      // array or values with extra metadata
      | Array<ExtendedEnumDescription>
      // object where object keys are the possible enum values and object values are additional metadata (works for strings only)
      | Record<string, Omit<ExtendedEnumDescription, 'value'>>
    ),
});


export const DmnoBaseTypes = {
  string: StringDataType,
  number: NumberDataType,
  boolean: BooleanDataType,

  enum: EnumDataType,

  url: UrlDataType,
  // TODO:
  // - email
  // - url
  // - ip address
  // - port number
  // - semver range
  // - date / timestamp / etc

  // "compound" types /////////////////
  object: ObjectDataType,
  array: ArrayDataType,
  dictionary: DictionaryDataType, // TODO: could be called record? something else?
};

// cannot use `keyof typeof DmnoBaseTypes` as it creates a circular reference...
// so we'll list the basic types that don't need any options
export type DmnoSimpleBaseTypeNames = 'string' | 'number' | 'url' | 'boolean';



// example of defining common type using our base types
export const NodeEnvType = createDmnoDataType({
  // TODO: might want to split the base types from these? (both in "dmno/" for now)
  typeLabel: 'dmno/nodeEnv',

  typeDescription: 'standard environment flag for Node.js',
  extends: DmnoBaseTypes.enum({
    development: { description: 'true during local development' },
    test: { description: 'true while running tests' },
    production: { description: 'true for production' },
  }),
  // we'll set the default value, and assume it will be passed in via the environment to override
  value: 'development',
});
