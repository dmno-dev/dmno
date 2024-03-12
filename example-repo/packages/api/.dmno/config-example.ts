import { defineConfigSchema, DmnoBaseTypes, NodeEnvType, configPath, dmnoFormula, toggleByEnv, valueCreatedDuringDeployment, createDmnoDataType } from '@dmno/core';
import { OnePasswordSecretService } from '@dmno/1password-plugin';

const myCustomType = createDmnoDataType({
  extends: DmnoBaseTypes.string({ isLength: 2 }),
})

export default defineConfigSchema({
  name: 'api',
  parent: 'group1',
  pick: [
    // picking from other services you specify the source and key(s) to pick
    {
      source: 'root',
      key: 'SINGLE_KEY',
    },

    // if source is omitted, it will fallback to root
    { key: 'OTHER_KEY_FROM_ROOT' },

    // shorthand to pick single key from root
    'SHORTHAND_PICK_FROM_ROOT',
    
    // you can pick multiple keys
    {
      source: 'other-service',
      key: ['MULTIPLE', 'KEYS'],
    },
    
    // can pick by filtering all keys with a function
    {
      source: 'root',
      key: (key) => key.startsWith('DB_'),
    },

    // key can be transformed, and can be a static value if picking a single key
    {
      key: 'ORIGINAL_KEY',
      renameKey: 'NEW_KEY_NAME',
    },

    // or use a function if picking multiple
    {
      key: ['KEY1', 'KEY2'],
      renameKey: (k) => `PREFIX_${k}`,
    },

    // values can also be transformed
    {
      key: 'GROUP1_THINGY',
      transformValue: (v) => v + 1,
    },
  ],
  
  schema: {

    // SETTING ITEM TYPE  -----------------------------------------------------------------
    // the default method, where a datatype is called as a function with settings
    EXTENDS_TYPE_INITIALIZED: {
      extends: DmnoBaseTypes.number({ min: 100 })
    },
    // you can use a type that has not been initialized if no settings are needed
    EXTENDS_TYPE_UNINITIALIZED: {
      extends: DmnoBaseTypes.number
    },
    // string/named format works for some basic types (string, number, boolean, etc) with no settings
    EXTENDS_STRING: {
      extends: 'number'
    }, 
    // passing nothing will try to infer the type from a static value or fallback to a string otherwise
    DEFAULTS_TO_NUMBER: { value: 42 },       // infers number
    DEFAULTS_TO_STRING: { value: 'cool' },   // infers string
    FALLBACK_TO_STRING_NO_INFO: { },         // assumes string
    FALLBACK_TO_STRING_UNABLE_TO_INFER: {    // assumes string
      value: DevOnePassBackend.item('secret-id-12345'),  
    },

    // an additional shorthand is provided for config items with no settings other than a type
    SHORTHAND_TYPE_NAME: 'number',
    SHORTHAND_TYPE_UNINITIALIZED: DmnoBaseTypes.number,
    SHORTHAND_TYPE_INITIALIZED: DmnoBaseTypes.number({ min: 100 }),
    
    // and of course you can use custom types, which can in turn extend other types
    USE_CUSTOM_TYPE: {
      extends: myCustomType,
    },


    // SETTING VALUES -----------------------------------------------------------------
    // values can be set to a static value
    STATIC_VAL: {
      value: 'static'
    },
    // or use a function that takes a ctx object and makes other item values available
    FN_VAL: {
      value: (ctx) => `prefix_${ctx.get('OTHER_ITEM')}`
    },
    // a simple formula DSL is provided which handles common cases without needing to write a function
    SET_BY_FORMULA2: {
      value: dmnoFormula('prefix_{{ OTHER_ITEM }}'),
    },
    // or synced with a secure backend using a plugin
    SECRET_EXAMPLE: {
      value: DevOnePassBackend.itemByReference("op://dev test/example/username"),
    },

    // or toggled based on another value (usually an env flag, but not always)
    // and of course you can alway return other valid value settings within a toggle
    TOGGLED_ENV_EXAMPLE: {
      value: toggleByEnv({
        _default: 'default-value',
        staging: 'staging-value',
        production: DevOnePassBackend.item("item9876"),
      }),
    },

    // COMPLEX TYPE (object, arrays, maps) //////////////////////////
    OBJECT_EXAMPLE: {
      extends: DmnoBaseTypes.object({
        CHILD1: { },
        CHILD2: { },
      }),
    },

    ARRAY_EXAMPLE: {
      extends: DmnoBaseTypes.array({
        itemSchema: {
          extends: 'number'
        },
        minLength: 2,
      }),
    },

    DICTIONARY_EXAMPLE: {
      extends: DmnoBaseTypes.dictionary({
        itemSchema: {
          extends: 'number'
        },
        validateKeys: (key) => key.length === 2,
      }),
    },

    // VALIDATIONS /////////////////////////////////////////////////
    
    // most validation logic will likely be handled by helpers on the base types
    // but sometimes you may need something more custom
    // it wil run _after_ the type (extends) defined validation(s)
    VALIDATE_EXAMPLE: {  
      validate(val, ctx) {
        // throw an error with a meaningful message if possible
        if (val.startsWith('abc')) throw new Error('value must not start with "abc"');
        if (val.endsWith('xyz')) throw new Error('value must not end with "xyz"');
        return true;
      }
    },

    // async validations can be used if a validation needs to make async calls
    // note that it will not run constantly like regular validations
    ASYNC_VALIDATE_EXAMPLE: {
      asyncValidate: async (val, ctx) => {
        await checkExternalApiAccess({ token: val });
        return true;
      }
    },


    // OTHER SETTINGS //////////////////////////////////////////////
    KITCHEN_SINK: {
      summary: 'short label',
      description: 'longer description can go here',
      typeDescription: 'description about the type itself, rather than this instance of it',
      externalDocs: {
        description: 'label for the link to the docs',
        url: 'https://example.com/docs-about-this-type'
      },
      ui: {
        icon: 'mdi:aws', // uses iconify names, see https://icones.js.org for options
        color: 'FF0000',
      },

      required: true,
      secret: true,
      overridable: false,
      useAt: ['build', 'boot'],
      expose: true,
      importEnvKey: 'IMPORT_FROM_THIS_VAR',
      exportEnvKey: 'EXPORT_AS_THIS_VAR',
    },
  },
});
