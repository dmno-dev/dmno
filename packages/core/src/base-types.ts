import { ConfigItemDefinition, TypeExtendsDefinition } from "./config-engine"
import _ from 'lodash-es';




type TypeValidationResult = boolean | undefined | void;

// data types expose all the same options, except they additionally have a "settings schema"
// and their validations/normalize functions get passed in the _instance_ of those settings when invoked
type DmnoDataTypeOptions<T> =
  // the schema item validation/normalize fns do not get passed any settings
  Omit<ConfigItemDefinition, 'validate' | 'normalize' | 'asyncValidate'> &
  {
    settingsSchema?: T,
    /**
     * if the settings schema has nested types, this function must return
     * an array of the types that need to be initialized
     * */
    getChildren?: (settings?: T) => Record<string, ConfigItemDefinition>;
    validate?: (val: any, settings?: T) => TypeValidationResult;
    asyncValidate?: (val: any, settings?: T) => Promise<TypeValidationResult>;
    normalize?: (val: any, settings?: T) => any;
  };



export class DmnoDataType<T = any> {
  constructor(readonly typeDef: DmnoDataTypeOptions<T>, readonly typeInstanceOptions: T) {
  }
}


// TODO: figure this out
// when using a type, ideally we could omit usage options only when the schema has been mareked as `undefined | {}...`
// alternatively, we can force the user to write it a certain way, but it's nice to be flexible
// note that we have allowed the bare (non-function call, ie `extends: DmnoBaseTypes.string`) which
// is also unaware if the settings schema is able to be undefined or not
// (we're talking about allowing `DmnoBaseTypes.string()` vs only `DmnoBaseTypes.string({})`)
export function createDmnoDataType<T>(opts: DmnoDataTypeOptions<T>) {
  return function (usageOpts?: T) {
    return new DmnoDataType(opts, usageOpts);
  }
}


const StringDataType = createDmnoDataType({
  // summary: 'generic string data type',
  settingsSchema: Object as undefined | {
    minLength?: number;
    maxLength?: number;
    isLength?: number;
    startsWith?: string;
    endsWith?: string;
    
    matches?: RegExp | string;
    // isUpperCase?: boolean;
    // isLowerCase?: boolean;
    // isAlphaNumeric?: boolean;

    // allow/deny character list
    // more stuff?
  },

  normalize(val) {
    if (_.isString(val)) return val;
    if (_.isNil(val)) return '';
    return val.toString();
  },

  validate(val: string, settings) {
    if (_.isEmpty(settings)) return true;
    
    if (settings.minLength !== undefined && val.length < settings.minLength) {
      throw new Error(`Length must be more than ${settings.minLength}`);
    }
    if (settings.maxLength !== undefined && val.length > settings.maxLength) {
      throw new Error(`Length must be less than ${settings.maxLength}`);
    }
    if (settings.isLength !== undefined && val.length !== settings.isLength) {
      throw new Error(`Length must be exactly ${settings.isLength}`);
    }

    if (settings.startsWith && !val.startsWith(settings.startsWith)) {
      throw new Error(`Value must start with "${settings.startsWith}"`);
    }
    if (settings.endsWith && !val.endsWith(settings.endsWith)) {
      throw new Error(`Value must start with "${settings.endsWith}"`);
    }

    if (settings.matches) {
      const regex = _.isString(settings.matches) ? new RegExp(settings.matches) : settings.matches;
      const matches = val.match(regex);
      if (!matches) throw new Error(`Value must match regex "${settings.matches}"`);
    }
    
  }
});

const NumberDataType = createDmnoDataType({
  settingsSchema: Object as undefined | {
    min?: number;
    max?: number;
  },
  validate(val, settings) {
    return true;
  },
  normalize(val, settings) {
    if (val instanceof String) {
      const parsed = parseFloat(val as string);
      if (_.isNaN(parsed)) throw new Error('Unable to coerce string to number');
      return val;
    }
    if (!_.isFinite(val)) throw new Error(`Cannot convert ${val} to number`);
    return val;
  }
});


const BooleanDataType = createDmnoDataType({
  validate(val, settings) {
    return true;
  },
  normalize(val, settings) {
    // TODO: coerce to boolean
    return !!val;
  }
});


// Common utility types ///////////////////////////////////////////////////////////////

const URL_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;
const UrlDataType = createDmnoDataType({
  extends: StringDataType({}),
  // summary: 'url base type summary',
  settingsSchema: Object as undefined | {

  },
  validate(val, settings) {
    // TODO: this is testing assuming its a normal web/http URL
    // we'll want some options to enable/disable specific protocols and things like that...
    return URL_REGEX.test(val);
  }
})



// Complex "container" types //////////////////////////////////////////////////////////

const ObjectDataType = createDmnoDataType({
  settingsSchema: Object as any as Record<string, ConfigItemDefinition>,
  getChildren(settings) {
    return settings || {};
  }
});

const ArrayDataType = createDmnoDataType({
  settingsSchema: Object as {
    itemSchema?: ConfigItemDefinition;

    minLength?: number;
    maxLength?: number;
    isLength?: number;
  },
  getChildren(settings) {
    return { _item: settings?.itemSchema || {} };
  }
  // TODO: validate checks if it's an array
  // helper to coerce csv string into array of strings
});

const DictionaryDataType = createDmnoDataType({
  settingsSchema: Object as {
    itemSchema?: ConfigItemDefinition;

    validateKeys?: (key: string) => boolean;
    asyncValidateKeys?: (key: string) => Promise<boolean>;    
    keyDescription?: string
    // TODO: more features around the keys themselves

    minItems?: number;
    maxItems?: number;
    // TODO: more validations around the whole dict
  },
  getChildren(settings) {
    return { _item: settings?.itemSchema || {} };
  }
  // TODO: validate checks if it's an object

});

type PossibleEnumValues = string | number | boolean; // do we need explicitly allow null/undefined?
type ExtendedEnumDescription = {
  value: PossibleEnumValues,
  description?: string,
  // icon, color, docs url, etc...
}
const EnumDataType = createDmnoDataType({
  settingsSchema: Object as any as 
    (
      // simple list of values
      PossibleEnumValues[]
      // array or values with extra metadata
      | ExtendedEnumDescription[]
      // object where possible enum values (strings) are keys and values are metadata
      | Record<string, Omit<ExtendedEnumDescription, 'value'>>
    )
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
}

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
});
