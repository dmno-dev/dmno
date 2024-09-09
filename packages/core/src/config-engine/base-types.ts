import _ from 'lodash-es';
import {
  ConfigItemDefinition, ExternalDocsEntry, ResolverContext, TypeValidationResult,
} from './config-engine';
import { ConfigValueResolver, processInlineResolverDef } from './resolvers/resolvers';
import {
  CoercionError, EmptyRequiredValueError, SchemaError, ValidationError,
} from './errors';
import { SerializedDmnoDataType } from '../config-loader/serialization-types';
import { validateUrlPattern } from '../lib/url-pattern-utils';

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
  /** use instead of `instanceof DmnoDataType`
   * because there can be a different copy of dmno being used within vite from the dmno config loading process
   * */
  static checkInstanceOf(other: any) {
    return other?.typeDef && other?.primitiveTypeFactory;
  }


  parentType?: DmnoDataType;
  private _valueResolver?: ConfigValueResolver;

  readonly schemaErrors: Array<SchemaError> = [];

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
        if (DmnoDataType.checkInstanceOf(initializedDataType)) {
          this.parentType = initializedDataType;
        } else {
          throw new Error('found invalid parent (as result of fn) in extends chain');
        }
      // normal case - `extends: DmnoBaseTypes.number({ ... })`
      } else if (DmnoDataType.checkInstanceOf(this.typeDef.extends)) {
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

    if (_.isObject(this.typeDef.sensitive) && this.typeDef.sensitive.allowedDomains) {
      this.typeDef.sensitive.allowedDomains.forEach((urlPattern) => {
        if (!validateUrlPattern(urlPattern)) {
          this.schemaErrors.push(new SchemaError(`Invalid allowedDomain pattern "${urlPattern}"`));
        }
      });
    }
  }

  get valueResolver(): ConfigValueResolver | undefined {
    return this._valueResolver ?? this.parentType?.valueResolver;
  }


  validate(val: any, ctx?: ResolverContext): true | Array<ValidationError> {
    // first we'll deal with empty values, and we'll check al
    // we'll check all the way up the chain for required setting and deal with that first
    if (val === undefined || val === null) {
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
  private getDefItem<T extends keyof DmnoDataTypeOptions>(
    key: T,
    opts?: {
      mergeArray?: boolean,
    },
  ): DmnoDataTypeOptions[T] {
    // in mergeArray mode, we'll merge all values found in the ancestor chain into a single array
    if (opts?.mergeArray) {
      if (this.typeDef[key] === undefined) {
        return this.parentType?.getDefItem(key, opts);
      } else {
        const parentItemVal = this.parentType?.getDefItem(key, opts);
        return [..._.castArray(this.typeDef[key]), ...(parentItemVal ? _.castArray(parentItemVal) : [])];
      }
    }

    // first check if the item definition itself has a value
    if (this.typeDef[key] !== undefined) {
      return this.typeDef[key];
    // otherwise run up the ancestor heirarchy
    } else {
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
  get fromVendor() { return this.getDefItem('fromVendor'); }
  get sensitive() { return this.getDefItem('sensitive'); }
  get required() { return this.getDefItem('required'); }
  get useAt() { return this.getDefItem('useAt'); }
  get dynamic() { return this.getDefItem('dynamic'); }
  get importEnvKey() { return this.getDefItem('importEnvKey'); }
  get exportEnvKey() { return this.getDefItem('exportEnvKey'); }

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


  toJSON(): SerializedDmnoDataType {
    return {
      summary: this.summary,
      description: this.description,
      typeDescription: this.typeDescription,
      expose: this.expose,
      sensitive: this.sensitive,
      externalDocs: this.externalDocs,
      ui: this.ui,
      required: this.required,
      useAt: this.useAt,
      dynamic: this.dynamic,
    };
  }
}


// TODO: figure this out
// when using a type, ideally we could omit usage options only when the schema has been mareked as `undefined | {}...`
// alternatively, we can force the user to write it a certain way, but it's nice to be flexible
// note that we have allowed the bare (non-function call, ie `extends: DmnoBaseTypes.string`) which
// is also unaware if the settings schema is able to be undefined or not
// (we're talking about allowing `DmnoBaseTypes.string()` vs only `DmnoBaseTypes.string({})`)
export function createDmnoDataType<T>(
  opts: DmnoDataTypeOptions<T> & Required<Pick<DmnoDataTypeOptions, 'typeLabel'>>,
): DmnoDataTypeFactoryFn<T> {
  // we are going to return a function which takes an _instance_ of the type settings schema for example `{ minLength: 2 }`
  // and returns something which is able to use the DmnoDataType which knows how to combine the data type defintition and that isntance
  // of the options together

  // by storing a reference to this factory function we'll be able to compare a usage of the data type to the "type" itself
  // for example `myCustomStringType.isType(DmnoBaseTypes.string)`
  const typeFactoryFn = (usageOpts?: T) => new DmnoDataType<T>(opts, usageOpts ?? {} as T, typeFactoryFn);
  return typeFactoryFn;
}


// we'll use this to mark our primitive types in a way that end users can't do by accident
const PrimitiveBaseType = createDmnoDataType({ typeLabel: 'dmno/primitive' });

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
const StringDataType = createDmnoDataType({
  typeLabel: 'dmno/string',
  extends: PrimitiveBaseType,

  // summary: 'generic string data type',
  settingsSchema: Object as undefined | StringDataTypeSettings,

  coerce(rawVal, settings) {
    if (_.isNil(rawVal)) return undefined;
    let val = _.isString(rawVal) ? rawVal : rawVal.toString();

    if (settings?.toUpperCase) val = val.toUpperCase();
    if (settings?.toLowerCase) val = val.toLowerCase();

    return val;
  },

  validate(val: string, settings) {
    // we support returning multiple errors and our base types use this pattern
    // but many user defined types should just throw the first error they encounter
    const errors = [] as Array<ValidationError>;

    // special handling to not allow empty strings (unless explicitly allowed)
    if (val === '' && !settings.allowEmpty) {
      return [new ValidationError('If set, string must not be empty. Use `allowEmpty` option if this is intended.')];
    }

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

const URL_REGEX = /(?:^|\s)((https?:\/\/)?(?:localhost|[\w-]+(?:\.[\w-]+)+)(:\d+)?(\/\S*)?)/;
// swapped to above to allow localhost
// /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;
const UrlDataType = createDmnoDataType({
  typeLabel: 'dmno/url',
  extends: (settings) => StringDataType({
    ...settings.normalize && { toLowerCase: true },
  }),
  typeDescription: 'standard URL',
  settingsSchema: Object as undefined | {
    prependProtocol?: boolean
    normalize?: boolean,
    allowedDomains?: Array<string>
  },

  coerce(rawVal, settings) {
    if (settings?.prependProtocol && !rawVal.startsWith('https://')) {
      return `https://${rawVal}`;
    }
    return rawVal;
  },

  validate(val, settings) {
    // TODO: this is testing assuming its a normal web/http URL
    // we'll want some options to enable/disable specific protocols and things like that...
    // at the very least, need to consider allowing localhost, which should likely be an option
    const result = URL_REGEX.test(val);
    if (!result) return new ValidationError('URL doesnt match url regex check');
    if (settings?.allowedDomains) {
      const [protocol, , domain] = val.split('/');
      if (!settings.allowedDomains.includes(domain.toLowerCase())) {
        return new ValidationError(`Domain (${domain}) is not in allowed list: ${settings.allowedDomains.join(',')}`);
      }
    }
    return true;
  },
});


const SimpleObjectDataType = createDmnoDataType({
  typeLabel: 'dmno/simple-object',
  extends: PrimitiveBaseType,
  validate(val) {
    if (_.isPlainObject(val)) return true;
    return new ValidationError('Value must be an object');
  },
  coerce(val) {
    if (_.isPlainObject(val)) return val;
    // if value is a string, we'll try to JSON.parse and see if that is an objce
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

const EMAIL_REGEX = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
const emailDataType = createDmnoDataType({
  typeLabel: 'dmno/email',
  extends: (settings) => StringDataType({
    ...settings.normalize && { toLowerCase: true },
  }),
  typeDescription: 'standard email address',
  settingsSchema: Object as undefined | {
    // customDomainValidationFn: () => boolean,
    normalize?: boolean,

  },
  validate(val) {
    // check if it's a valid email
    const result = EMAIL_REGEX.test(val);
    if (result) return true;
    return new ValidationError('Value must be a valid email address');
  },
});

const IP_V4_ADDRESS_REGEX = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}$/;
const IP_V6_ADDRESS_REGEX = /^(?:(?:[a-fA-F\d]{1,4}:){7}(?:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,2}|:)|(?:[a-fA-F\d]{1,4}:){4}(?:(?::[a-fA-F\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,3}|:)|(?:[a-fA-F\d]{1,4}:){3}(?:(?::[a-fA-F\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,4}|:)|(?:[a-fA-F\d]{1,4}:){2}(?:(?::[a-fA-F\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,5}|:)|(?:[a-fA-F\d]{1,4}:){1}(?:(?::[a-fA-F\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,6}|:)|(?::(?:(?::[a-fA-F\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,7}|:)))(?:%[0-9a-zA-Z]{1,})?$/;
const ipAddressDataType = createDmnoDataType({
  typeLabel: 'dmno/ipAddress',
  extends: (settings) => StringDataType({
    ...settings.normalize && { toLowerCase: true },
  }),
  typeDescription: 'ip v4 or v6 address',
  settingsSchema: Object as undefined | {
    version?: 4 | 6,
    normalize?: boolean,
  },
  validate(val, settings) {
    // default to v4
    const regex = settings.version === 6 ? IP_V6_ADDRESS_REGEX : IP_V4_ADDRESS_REGEX;
    const result = regex.test(val);
    if (result) return true;
    return new ValidationError('Value must be a valid IP address');
  },
});

const PortDataType = createDmnoDataType({
  typeLabel: 'dmno/port',
  extends: NumberDataType({
    min: 0,
    max: 65535,
  }),
  typeDescription: 'valid port number between 0 and 65535',
  validate(val) {
    if (val >= 0 && val <= 65535) return true;
    return new ValidationError('Value must be a valid port number (0-65535)');
  },
});

const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
const SemverDataType = createDmnoDataType({
  typeLabel: 'dmno/semver',
  extends: (settings) => StringDataType({
    ...settings.normalize && { toLowerCase: true },
  }),
  typeDescription: 'semantic version string',
  settingsSchema: Object as undefined | {
    normalize?: boolean,
    // range?: string, // ex.
  },
  validate(val) {
    const result = SEMVER_REGEX.test(val);
    if (result) return true;
    return new ValidationError('Value must be a valid semantic version string');
  },
});

// https://rgxdb.com/r/526K7G5W
const ISO_DATE_REGEX = /^(?:[+-]?\d{4}(?!\d{2}\b))(?:(-?)(?:(?:0[1-9]|1[0-2])(?:\1(?:[12]\d|0[1-9]|3[01]))?|W(?:[0-4]\d|5[0-2])(?:-?[1-7])?|(?:00[1-9]|0[1-9]\d|[12]\d{2}|3(?:[0-5]\d|6[1-6])))(?:[T\s](?:(?:(?:[01]\d|2[0-3])(?:(:?)[0-5]\d)?|24:?00)(?:[.,]\d+(?!:))?)?(?:\2[0-5]\d(?:[.,]\d+)?)?(?:[zZ]|(?:[+-])(?:[01]\d|2[0-3]):?(?:[0-5]\d)?)?)?)?$/;
const IsoDateDataType = createDmnoDataType({
  typeLabel: 'dmno/isoDate',
  extends: StringDataType,
  typeDescription: 'ISO 8601 date string with optional time and milliseconds',
  validate(val) {
    const result = ISO_DATE_REGEX.test(val);
    if (result) return true;
    return new ValidationError('Value must be a valid ISO 8601 date string');
  },
});


const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UuidDataType = createDmnoDataType({
  typeLabel: 'dmno/uuid',
  extends: StringDataType,
  typeDescription: 'UUID string V1-V5 per RFC4122, including NIL',
  validate(val) {
    const result = UUID_REGEX.test(val);
    if (result) return true;
    return new ValidationError('Value must be a valid UUID string');
  },
});

const MD5_REGEX = /^[a-f0-9]{32}$/;
const Md5DataType = createDmnoDataType({
  typeLabel: 'dmno/md5',
  extends: StringDataType,
  typeDescription: 'MD5 hash string',
  validate(val) {
    const result = MD5_REGEX.test(val);
    if (result) return true;
    return new ValidationError('Value must be a valid MD5 hash string');
  },
});


// TODO consider splitting into base and utility types
export const DmnoBaseTypes = {
  string: StringDataType,
  number: NumberDataType,
  boolean: BooleanDataType,
  simpleObject: SimpleObjectDataType,

  enum: EnumDataType,
  email: emailDataType,
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

// cannot use `keyof typeof DmnoBaseTypes` as it creates a circular reference...
// so we'll list the basic types that don't need any options
export type DmnoSimpleBaseTypeNames = 'string' | 'number' | 'url' | 'boolean' | 'simpleObject';



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
