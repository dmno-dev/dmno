import { ConfigSchemaItem, createDmnoDataType } from "./config-engine"
import * as _ from 'lodash';

const StringDataType = createDmnoDataType({
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

const ObjectDataType = createDmnoDataType({
  settingsSchema: Object as any as Record<string, ConfigSchemaItem>,
});

const ArrayDataType = createDmnoDataType({
  settingsSchema: Object as {
    childExtends?: ConfigSchemaItem;

    minLength?: number;
    maxLength?: number;
    isLength?: number;
  }
  // TODO: validate checks if it's an array
  // helper to coerce csv string into array of strings
});

const DictionaryDataType = createDmnoDataType({
  settingsSchema: Object as {
    childExtends?: any;

    validateKeys?: (key: string) => boolean;
    asyncValidateKeys?: (key: string) => Promise<boolean>;    
    keyDescription?: string
    // TODO: more features around the keys themselves

    minItems?: number;
    maxItems?: number;
    // TODO: more validations around the whole dict
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
  enum: EnumDataType, 

  // TODO:
  // - boolean
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


// example of defining common type using our base types
export const NodeEnvType = createDmnoDataType({
  extends: DmnoBaseTypes.enum({
    development: { description: 'true during local development' },
    test: { description: 'true while running tests' },
    production: { description: 'true for production' },
  }),
});
