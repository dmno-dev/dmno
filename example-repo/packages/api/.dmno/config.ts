import { defineConfigSchema, DmnoBaseTypes, NodeEnvType, configPath, dmnoFormula, toggleByEnv } from '@dmno/core';
import { OnePasswordSecretService } from '@dmno/1password-plugin';

const DevOnePassBackend = new OnePasswordSecretService(
  configPath('ONE_PASSWORD.DEV_SERVICE_ACCOUNT_TOKEN'),
);

const ProdOnePassBackend = new OnePasswordSecretService(
  configPath('ONE_PASSWORD.PROD_SERVICE_ACCOUNT_TOKEN'),
);

defineConfigSchema({
  name: 'api',
  parent: 'group1',
  pick: [
    'ONE_PASSWORD',

    // you can specify which service to pick from
    // and which key(s)
    {
      source: 'root', // defaults to root if none specified
      key: 'SINGLE_KEY',
    },


    // shorthand to pick from root
    'SHORTHAND_PICK_FROM_ROOT',
    
    {
      source: 'root',
      key: ['MULTIPLE', 'KEYS'],
    },
    {
      source: 'root',
      key: (key) => key.startsWith('pick_using_fn'),
    },

    {
      source: 'group1',
      key: ['GROUP1_THINGY'],
      transformValue: (v) => v,
    },
  ],
  schema: {
    NODE_ENV: {
      extends: NodeEnvType,
    },

    SECRET_EXAMPLE: {
      value: DevOnePassBackend.itemByReference("op://dev test/example/username"),
    },
    TOGGLED_EXAMPLE: {
      value: toggleByEnv({
        _default: DevOnePassBackend.itemByReference("example/username"),
        staging: DevOnePassBackend.itemByReference("example/username"),
        production: ProdOnePassBackend.itemByReference("example/username"),

        static: 'staticValue',
        resolver: dmnoFormula('formula_{{ SOME_VAR }}_value'),
        fn: (ctx) => {
          return ctx.get('OTHER_VAL') + "_fn";
        },
      }),
    },

    STATIC_VAL: {
      value: 'this-is-a-default',
    },

    SET_BY_FN_VAL: {
      value: (ctx) => {
        return `derived_${ctx.get('OTHER_THING')}`;
      }
    },
    SET_BY_FORMULA: {
      value: dmnoFormula('prefix_{{OTHER_VAL}}')
    },
    // SET_BY_FORMULA2: {
    //   valueFormula: 'prefix_{{OTHER_VAL}}'
    // },

    TOGGLE_BY_ENV_VAL: {
      value(ctx) {
        return {
          'dev': 'dev-val',
          'staging': 'staging-val',
          'prod': 'prod-val'
        }[ctx.get('DMNO_ENV')];
      }
    },

    // TOGGLE_BY_ENV_VAL2: {
    //   valueLookupBy: 'DMNO_ENV',
    //   valueLookup: {
    //     'dev': 'dev-val',
    //     'staging': 'staging-val',
    //     'prod': 'prod-val'
    //   }
    // },

    // TOGGLE_BY_ENV_VAL3: {
    //   value: setByLookup('DMNO_ENV', {
    //     'dev': 'dev-val',
    //     'staging': 'staging-val',
    //     'prod': 'prod-val'
    //   })
    // },


    // SENSITIVE_KEY: {
    //   valueByEnv: {
    //     default: Sync1PassValue('asdf'),
    //     staging: Sync1PassValue('asdf2'),
    //     production: Sync1PassValue('asdf3'),
    //   }
    // },

    // GENERATED_KEY: {
    //   value: KeyGenHelper({
    //     expires:
    //   }),
    // },

    SOME_KEY: {
      importEnvKey: 'SOMEKEY2',
      exportEnvKey: 'SOME_KEY_RENAMED',
    },

    EXAMPLE_NUMBER: {
      extends: DmnoBaseTypes.number({
        max: 100
      }),
      required: true,
    },


    EXAMPLE_OBJECT: {
      extends: DmnoBaseTypes.object({
        CHILD1: {
          extends: DmnoBaseTypes.number({
            max: 100,
          }),
          value: 'more stuff',
          validate(val, ctx) {
            if (ctx.get('OTHER_THING')) {
              return false;
            }
            return true;
          }
        },
      }),
      validate(fullObject) {
        return true;
      }

    },

    // use extra argument to wrap type
    // EXAMPLE_ARRAY_v1: {
    //   extends: DmnoBaseTypes.array({
    //     extends: DmnoBaseTypes.number({ max: 100 }),
    //   }, {
    //     minLength: 2,
    //   }),
    //   value: [1,2,3],
    // },

    // uses a prop to wrap the type
    EXAMPLE_ARRAY_v2: {
      extends: DmnoBaseTypes.array({
        childExtends: {
          extends: DmnoBaseTypes.number({ max: 100 })
        },
        minLength: 2,
      }),
      value: [1,2,3],
    },

    // uses a prop to wrap the type
    // EXAMPLE_ARRAY_v3: {
    //   extends: DmnoCompoundTypes.array(DmnoBaseTypes.number({ max: 100 }), {},
    //   value: [1,2,3],
    // },

    

    // EXAMPLE_DICT: {
    //   extends: 'object',
    //   childType: 'number',
    //   value: {
    //     key1: 1,
    //     key2: 2,
    //     key3: 3,
    //   }
    // },

    // STRIPE_KEY: {
    //   extends: StripeKeyType,
    //   description: 'stripe key for our primary merchant account'
    // },

    // SSL_CERT: {
    //   type: DmnoFile({
    //     saveAtPath: '/etc/cert'
    //   })
    // },

    SET_BY_FN_V1: {
      value: (ctx) => `prefix_${ctx.get('OTHER_VAL')}`,
    },


    // VITE_TRANSORMED_KEY {
    //   pickFrom: {
    //     source: 'root',
    //     key: 'TRANSFORMED_KEY',
    //   }
    // },

    // PICKED_KEY {
    //   pickFrom: {
    //     source: 'root',
    //   }
    // },

    // STRIPE_KEY: {
    //   validate: (ctx, value) => {
    //     if (ctx.NODE_ENV === 'production') {
    //       return !value.startsWith('ps_live_');
    //     }
    //   },
    //   asyncValidate: async (ctx, value) => {
    //     await someApi(value)
    //   }
    // },


    // OBJECT_EXAMPLE: {
    //   extends: DmnoBaseTypes.object({
    //     children: {
    //       THING_1: {
    //         description: 'thing1 docs',
    //         required: true,
    //       }
    //     }
    //   })
    // },
  },
  output: {
    API_URL: {
      description: 'public url of this service'
    },
  },
});