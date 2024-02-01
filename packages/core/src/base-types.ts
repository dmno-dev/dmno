import { createDmnoDataType } from "./config-engine"
import * as _ from 'lodash';

const StringDataType = createDmnoDataType({
  settingsSchema: Object as {
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
  settingsSchema: Object as {
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


export const DmnoBaseTypes = {
  string: StringDataType,
  number: NumberDataType,
}