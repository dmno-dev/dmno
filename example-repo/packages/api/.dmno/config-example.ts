import {
  defineDmnoService, DmnoBaseTypes, configPath, dmnoFormula,switchByNodeEnv,
  createDmnoDataType, ValidationError,
  EncryptedFileStorePlugin
} from '@dmno/core';
import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';

// plugins can be used to create reusable functionality and can reference config items in their initialization
const encryptedSecrets = new EncryptedFileStorePlugin('vault', { name: 'local-secrets', key: configPath('LOCAL_SECRETS_KEY') });

// pre-configured plugins can be auto-injected from those that were initialized in the workspace root
const onePassSync = OnePasswordDmnoPlugin.injectInstance('1pass');

export default defineDmnoService({
  // each service can be explicitly named or will default to the name from its package.json
  name: 'api', 
  
  // explicitly set a parent service to nest them, otherwise everything is a child of the "root" workspace
  // this affects the dependency graph of services and it affects "picking" logic (see below)
  parent: 'group1',

  // config items can be "picked" from other services (in every service except the root)
  // while picking from an ancestor, you can pick from _all_ config items in that service
  // otherwise you can only pick items that have been marked as `expose: true`
  pick: [
    // you can specify the source service name and key(s) to pick
    {
      source: 'root',
      key: 'SINGLE_KEY',
    },

    // if source is omitted, it will fallback to the workspace root
    { key: 'OTHER_KEY_FROM_ROOT' },

    // shorthand to pick single key from root
    'SHORTHAND_PICK_FROM_ROOT',
    
    // you can pick multiple keys at once
    {
      source: 'other-service',
      key: ['MULTIPLE', 'KEYS'],
    },
    
    // you can pick by filtering keys with a function
    // (filters from all items or just exposed items depending if the source is an ancestor)
    {
      source: 'root',
      key: (key) => key.startsWith('DB_'),
    },

    // keys can be transformed, and you can use a static value if picking a single key
    {
      key: 'ORIGINAL_KEY',
      renameKey: 'NEW_KEY_NAME',
    },

    // or use a function if picking multiple
    {
      key: ['KEY1', 'KEY2'],
      renameKey: (k) => `PREFIX_${k}`,
    },

    // values can also be transformed with functions
    {
      key: 'GROUP1_THINGY',
      transformValue: (v) => v + 1,
    },
  ],
  
  // services also define more config items relevant to only themselves and to be picked by others
  schema: {

    // SETTING ITEM TYPE  -----------------------------------------------------------------
    // the default method, where a datatype is called as a function with some settings
    EXTENDS_TYPE_INITIALIZED: {
      extends: DmnoBaseTypes.number({ min: 0, max: 100 })
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
      value: onePassSync.item('https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=bphvvrqjegfmd5yoz4buw2aequ&h=dmnoinc.1password.com'),
    },

    // an additional shorthand is provided for config items with no settings other than extends/type
    // (although not recommended because attaching additional metadata/info is helpful)
    SHORTHAND_TYPE_NAME: 'number',
    SHORTHAND_TYPE_UNINITIALIZED: DmnoBaseTypes.number,
    SHORTHAND_TYPE_INITIALIZED: DmnoBaseTypes.number({ min: 100 }),
    
    // and of course you can use custom types (see below), which can in turn extend other types
    USE_CUSTOM_TYPE: {
      extends: MyCustomPostgresConnectionUrlType, 
      // additional settings can be added/overridden as normal
      required: true,
    },


    // SETTING VALUES -----------------------------------------------------------------
    // config items can specify how to set their value within their schema
    // so you can set sensible defaults, or even set all possible values and sync secrets securely with various backends
    // overrides from .env file(s) and actual environment variables will also be applied
    // and then coercion/validation logic will be run on the resolved value

    // values can be set to a static value - useful for constants and settings that will be overridden by env vars
    STATIC_VAL: {
      value: 'static'
    },
    // or use a function that takes a ctx object that has other config item values available
    FN_VAL: {
      value: (ctx) => `prefix_${ctx.get('OTHER_ITEM')}`
    },
    // a simple formula DSL is provided which handles common cases without needing to write a function at all
    SET_BY_FORMULA2: {
      value: dmnoFormula('prefix_{{ OTHER_ITEM }}'),
    },
    // or synced with a secure backend using a plugin
    SECRET_EXAMPLE: {
      value: onePassSync.itemByReference("op://dev test/example/username"),
    },

    // or switched based on another value (often an env flag, but not always)
    // and a "value resolver" can always return another resolver, which lets you easily compose functionality 
    // NOTE - it's easy to author your own reusable resolvers to create whatever functionality you need
    SWITCHED_ENV_EXAMPLE: {
      value: switchByNodeEnv({
        _default: 'default-value',
        staging: (ctx) => `${ctx.get('NODE_ENV')}-value`,
        production: onePassSync.item("https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=bphvvrqjegfmd5yoz4buw2aequ&h=dmnoinc.1password.com"),
      }),
    },

    // COMPLEX TYPES (object, arrays, maps) //////////////////////////
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

    // VALIDATIONS + COERCION /////////////////////////////////////////////////
    
    // most validation logic will likely be handled by helpers on reusable types
    // but sometimes you may need something more custom
    // it will run _after_ the type (extends) defined validation(s)
    VALIDATE_EXAMPLE: {
      extends: DmnoBaseTypes.string({ isLength: 128, startsWith: 'pk_' }),
      validate(val, ctx) {
        // validations can use the ctx to access other values
        if (ctx.get('NODE_ENV') === 'production') {
          if (!val.startsWith('pk_live_')) {
            // throw a ValidationError with a meaningful message
            throw new ValidationError('production key must start with "pk_live_"');
          }
        }
        return true;
      }
    },

    // async validations can be used if a validation needs to make async calls
    // NOTE - these will be triggered on-demand rather than run constantly like regular validations
    ASYNC_VALIDATE_EXAMPLE: {
      asyncValidate: async (val, ctx) => {
        // if the request succeeds, we know the value was ok
        await fetch(`https://example.com/api/items/${val}`);
        return true;
      }
    },


    // MORE SETTINGS //////////////////////////////////////////////
    KITCHEN_SINK: {
      // some basic info will help within the UI and be included in generated ts types
      // as well as help other devs understand what this env var is for :)
      summary: 'short label',
      description: 'longer description can go here',
      // mark an item as required so it will fail validation if empty
      required: true,
      // mark an item as secret so we know it must be handled sensitively!
      // for example, it will not be logged or injected into front-end builds
      sensitive: true,
      // understand when this value is used, which lets us parallelize run/deploy
      // and know when a missing item should be considered a critical problem or be ignored
      useAt: ['build', 'boot', 'deploy'],
      // mark an item as being "exposed" for picking by other services
      expose: true,
      // override name when importing/exporting into process.env
      importEnvKey: 'IMPORT_FROM_THIS_VAR',
      exportEnvKey: 'EXPORT_AS_THIS_VAR',
    },
  },
});

// our custom type system allows you to build your own reusable types
// or to take other plugin/community defined types and tweak them as necessary
// internally a chain of "extends" types is stored and settings are resolved by walking up the chain
const MyCustomPostgresConnectionUrlType = createDmnoDataType({
  // you can extend one of our base types or another custom type...
  extends: DmnoBaseTypes.url,

  // all normal config item settings are supported
  sensitive: true,

  // a few docs related settings made for reusable types (although they can still be set directly on items)
  // these will show up within the UI and generated types in various ways
  typeDescription: 'Postgres connection url',
  externalDocs: {
    description: 'explanation from prisma docs',
    url: 'https://www.prisma.io/dataguide/postgresql/short-guides/connection-uris#a-quick-overview'
  },
  ui: {
    // uses iconify names, see https://icones.js.org for options
    icon: 'akar-icons:postgresql-fill',
    color: '336791', // postgres brand color :)
  },

  // for validation/coercion, we walk up the chain and apply the functions from top to bottom
  // for example, given the following type chain:
  // - DmnoBaseTypes.string - makes sure the value is a string
  // - DmnoBaseTypes.url - makes sure that string looks like a URL
  // - PostgresConnectionUrlType - checks that url against some custom logic
  validate(val, ctx) {
    // TODO: check this url looks like a postgres connection url
  },
  // but you can alter the exection order, or disable the parent altogether
  runParentValidate: 'after', // set to `false` to disable running the parent's validate
});
