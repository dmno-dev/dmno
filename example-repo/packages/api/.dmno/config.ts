import { defineConfigSchema } from '@dmno/core';


const StripeKey = new DmnoType({
  extends: DmnoTypes.String,
  validate()
})


defineConfigSchema({
  name: 'api',
  parent: 'group1',
  
  
  pick: [
    'SOURCE_DEFAULTS_TO_ROOT',
    // equivalent to
    {
      key: 'SOURCE_DEFAULTS_TO_ROOT',
    },


    {
      source: 'root',
      key: 'SINGLE_KEY',
    },
    {
      source: 'root',
      key: ['MULTIPLE', 'KEYS'],
    },
    {
      source: 'root',
      key: (key) => key.startWith('pick_using_fn'),
    },

    {
      source: 'group1',
      key: ['GROUP1_THINGY'],
      transformValue: (v) => v,
    },
  ],
  schema: {
    // REGEX_KEY: {
    //   dataType: 'integer',
    // },
    // STRIPE_KEY: {
    //   dataType: StripeKey,
    // },


    STATIC_VAL: {
      value: 'this-is-a-default',
    },

    SET_BY_FN_VAL: {
      value: (ctx) => {
        return `derived_${ctx.OTHER_THING}`;
      }
    },
    SET_BY_FORMULA: {
      value: DmnoFormula('prefix_{{OTHER_VAL}}')
    },
    SET_BY_FORMULA2: {
      valueFormula: 'prefix_{{OTHER_VAL}}'
    },

    TOGGLE_BY_ENV_VAL: {
      value: (ctx) => {
        return {
          'dev': 'dev-val',
          'staging': 'staging-val',
          'prod': 'prod-val'
        }[ctx.DMNO_ENV];
      }
    },

    TOGGLE_BY_ENV_VAL2: {
      valueLookupBy: 'DMNO_ENV',
      valueLookup: {
        'dev': 'dev-val',
        'staging': 'staging-val',
        'prod': 'prod-val'
      }
    },

    TOGGLE_BY_ENV_VAL3: {
      value: setByLookup('DMNO_ENV', {
        'dev': 'dev-val',
        'staging': 'staging-val',
        'prod': 'prod-val'
      })
    },


    SENSITIVE_KEY: {
      valueByEnv: {
        default: Sync1PassValue('asdf'),
        staging: Sync1PassValue('asdf2'),
        production: Sync1PassValue('asdf3'),
      }
    },

    GENERATED_KEY: {
      value: KeyGenHelper({
        expires:
      }),
    },,

    SOME_KEY: {
      importEnvKey: 'SOMEKEY2',
      exportEnvKey: 'SOME_KEY_RENAMED',
    },


    EXAMPLE_OBJECT: {
      type: 'object',
      children: {
        CHILD1: { value: 'more stuff' },
      },
      validate()
    },
    EXAMPLE_ARRAY: {
      type: 'array',
      childType: 'number',
      value: [1,2,3],
    },
    EXAMPLE_DICT: {
      type: 'object',
      childType: 'number',
      value: {
        key1: 1,
        key2: 2,
        key3: 3,
      }
    },

    STRIPE_KEY: {
      extends: StripeKeyType,
      description: 'stripe key for our primary merchant account'
    },

    SSL_CERT: {
      type: DmnoFile({
        saveAtPath: '/etc/cert'
      })
    },

    SET_BY_FN_V1: {
      value: (ctx) => `prefix_${ctx.OTHER_VAL}`,
    },
    SET_BY_FN_V2: {
      value: {
        dependsOn: ['OTHER_VAL'], 
        set: (ctx) => `prefix_${ctx.OTHER_VAL}`,
    }


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
  },
  output: {
    API_URL: {
      description: 'public url of this service'
    }
  }
})