import _ from 'lodash-es';
import { ConfigItemDefinition, ResolverContext, TypeValidationResult } from './config-engine';






// data types expose all the same options, except they additionally have a "settings schema"
// and their validations/normalize functions get passed in the _instance_ of those settings when invoked
/**
 * Represents the options for a DmnoDataType
 * @category HelperMethods
 */
export type DmnoDataTypeOptions<T> =
  // the schema item validation/normalize fns do not get passed any settings
  Omit<ConfigItemDefinition, 'validate' | 'coerce' | 'asyncValidate'> &
  {
    settingsSchema?: T,
    /**
     * if the settings schema has nested types, this function must return
     * an array of the types that need to be initialized
     * */
    getChildren?: (settings?: T) => Record<string, ConfigItemDefinition>;

    validate?: (val: any, settings?: T) => TypeValidationResult;
    asyncValidate?: (val: any, settings?: T) => Promise<TypeValidationResult>;
    coerce?: (val: any, settings?: T) => any;
  };




export class DmnoDataType<T = any> {
  // NOTE - note quite sure about this setup yet...
  // but the idea is to provide a wrapped version of the validate/coerce (the fns that need the type instance options)
  // while providing transparent access to the rest. This is so the ConfigItem can just walk up the chain of types
  // without having to understand the details... The other option is to revert that change and

  constructor(readonly typeDef: DmnoDataTypeOptions<T>, readonly typeInstanceOptions: T) {
  }

  validateUsingInstanceOptions(val: any) {
    if (!this.typeDef.validate) throw new Error('should not be calling validate');
    return this.typeDef.validate(val, this.typeInstanceOptions);
  }
  asyncValidateUsingInstanceOptions(val: any) {
    if (!this.typeDef.asyncValidate) throw new Error('should not be calling asyncValidate');
    return this.typeDef.asyncValidate(val, this.typeInstanceOptions);
  }
  coerceUsingInstanceOptions(val: any) {
    if (!this.typeDef.coerce) throw new Error('should not be calling coerce');
    return this.typeDef.coerce(val, this.typeInstanceOptions);
  }
}


// TODO: figure this out
// when using a type, ideally we could omit usage options only when the schema has been mareked as `undefined | {}...`
// alternatively, we can force the user to write it a certain way, but it's nice to be flexible
// note that we have allowed the bare (non-function call, ie `extends: DmnoBaseTypes.string`) which
// is also unaware if the settings schema is able to be undefined or not
// (we're talking about allowing `DmnoBaseTypes.string()` vs only `DmnoBaseTypes.string({})`)
export function createDmnoDataType<T>(opts: DmnoDataTypeOptions<T>) {
  return (usageOpts?: T) => new DmnoDataType(opts, usageOpts);
}


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
};

/**
 * Represents a generic string data type.
 * @category Base Types
 */
const StringDataType = createDmnoDataType({
  // summary: 'generic string data type',
  /**
   * Defines the settings schema for the string data type.
   */
  settingsSchema: Object as undefined | StringDataTypeSettings,

  coerce(val) {
    if (_.isString(val)) return val;
    if (_.isNil(val)) return '';
    return val.toString();
  },

  validate(val: string, settings) {
    if (_.isEmpty(settings)) return true;

    // we support returning multiple errors and our base types use this pattern
    // but many user defined types should just throw the first error they encounter
    const errors = [] as Array<Error>;
    if (settings.minLength !== undefined && val.length < settings.minLength) {
      errors.push(new Error(`Length must be more than ${settings.minLength}`));
    }
    if (settings.maxLength !== undefined && val.length > settings.maxLength) {
      errors.push(new Error(`Length must be less than ${settings.maxLength}`));
    }
    if (settings.isLength !== undefined && val.length !== settings.isLength) {
      errors.push(new Error(`Length must be exactly ${settings.isLength}`));
    }

    if (settings.startsWith && !val.startsWith(settings.startsWith)) {
      errors.push(new Error(`Value must start with "${settings.startsWith}"`));
    }
    if (settings.endsWith && !val.endsWith(settings.endsWith)) {
      errors.push(new Error(`Value must start with "${settings.endsWith}"`));
    }

    if (settings.matches) {
      const regex = _.isString(settings.matches) ? new RegExp(settings.matches) : settings.matches;
      const matches = val.match(regex);
      if (!matches) {
        errors.push(new Error(`Value must match regex "${settings.matches}"`));
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
  isInt?: boolean;
  /**
   * The precision of the number.
   */
  precision?: number;
};

/**
 * Represents a generic number data type.
 * @category Base Types
 */
const NumberDataType = createDmnoDataType({
  settingsSchema: Object as undefined | NumberDataTypeSettings
  & ({ isInt: true; } | { isInt?: never; precision?: number }),
  validate(val, settings = {}) {
    const errors = [] as Array<Error>;
    if (settings.min !== undefined && val < settings.min) {
      errors.push(new Error(`Min value is ${settings.min}`));
    }
    if (settings.max !== undefined && val > settings.max) {
      errors.push(new Error(`Max value is ${settings.max}`));
    }
    if (settings.isDivisibleBy !== undefined && val % settings.isDivisibleBy !== 0) {
      errors.push(new Error(`Value must be divisible by ${settings.isDivisibleBy}`));
    }
    return errors.length ? errors : true;
  },
  coerce(val, settings = {}) {
    let numVal!: number;
    if (_.isString(val)) {
      const parsed = parseFloat(val);
      if (_.isNaN(parsed)) throw new Error('Unable to coerce string to number');
      numVal = parsed;
    } else if (_.isFinite(val)) {
      numVal = val;
    } else {
      throw new Error(`Cannot convert ${val} to number`);
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
  // TODO: add settings to be more strict, or to allow other values to coerce to true/false
  validate(val, settings) {
    if (_.isBoolean(val)) return true;
    return new Error('Value must be `true` or `false`');
  },
  coerce(val, settings) {
    if (_.isBoolean(val)) {
      return val;
    } else if (_.isString(val)) {
      const cleanVal = val.toLowerCase().trim();
      if (['t', 'true', 'yes', 'on', '1'].includes(cleanVal)) return true;
      if (['f', 'false', 'no', 'off', '0'].includes(cleanVal)) return false;
      throw new Error('Unable to coerce string value to boolean');
    } else if (_.isFinite(val)) {
      if (val === 0) return false;
      if (val === 1) return true;
      throw new Error('Unable to coerce number value to boolean (only 0 or 1 is valid)');
    } else {
      throw new Error('Unable to coerce value to boolean');
    }
  },
});


// Common utility types ///////////////////////////////////////////////////////////////

const URL_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;
const UrlDataType = createDmnoDataType({
  extends: StringDataType({}),
  // summary: 'url base type summary',
  settingsSchema: Object as undefined | {

  },
  validate(val, settings) {
    // TODO: this is testing assuming its a normal web/http URL
    // we'll want some options to enable/disable specific protocols and things like that...
    return URL_REGEX.test(val);
  },
});



// Complex "container" types //////////////////////////////////////////////////////////

const ObjectDataType = createDmnoDataType({
  settingsSchema: Object as any as Record<string, ConfigItemDefinition>,
  getChildren(settings) {
    return settings || {};
  },
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
  settingsSchema: Array as undefined | ArrayDataTypeSettings,
  getChildren(settings) {
    return { _item: settings?.itemSchema || {} };
  },
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
  settingsSchema: Object as undefined | DictionaryDataTypeSettings,
  getChildren(settings) {
    return { _item: settings?.itemSchema || {} };
  },
  // TODO: validate checks if it's an object

});

type PossibleEnumValues = string | number | boolean; // do we need explicitly allow null/undefined?
type ExtendedEnumDescription = {
  value: PossibleEnumValues,
  description?: string,
  // icon, color, docs url, etc...
};

const EnumDataType = createDmnoDataType({
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
  extends: DmnoBaseTypes.enum({
    development: { description: 'true during local development' },
    test: { description: 'true while running tests' },
    production: { description: 'true for production' },
  }),
  // we'll set the default value, and assume it will be passed in via the environment to override
  value: 'development',
});
