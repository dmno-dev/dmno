import { DmnoBaseTypes, cacheFunctionResult, createDmnoDataType, defineDmnoService, switchBy } from 'dmno';
import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';

const OnePassBackend = OnePasswordDmnoPlugin.injectInstance('1pass');

const customUrlType = createDmnoDataType<{ newSetting: boolean }>({
  typeLabel: 'my-custom-url',
  extends: DmnoBaseTypes.url({
    prependProtocol: true,
    normalize: true,
  }),
  summary: 'summary from custom type',
});

export default defineDmnoService({
  name: 'web',
  parent: 'group1',
  settings: {
    dynamicConfig: 'only_static',
  },
  pick: [
    'NODE_ENV',
    'DMNO_ENV',
    // 'GOOGLE_ANALYTICS_MEASUREMENT_ID',
    {
      source: 'api',
      key: 'API_URL',
      renameKey: 'VITE_API_URL',
    },
    {
      source: 'group1',
      // picking the renamed key from group1
      key: 'PICK_TEST_G1',
      renameKey: 'PICK_TEST_W',
      // should apply _after_ the group1 transform
      transformValue: (val) => `${val}-webtransform`,
    }
  ],
  schema: {
    // OP_ITEM_1: {
    //   sensitive: true,
    //   value: OnePassBackend.item(),
    // },

    // EX1: {
    //   value: (ctx) => DMNO_CONFIG.BOOLEAN_EXAMPLE,
    // },

    ENUM_EXAMPLE: {
  
      ui: {
        icon: 'bi:apple',
        color: 'FF0000'
      },
      extends: DmnoBaseTypes.enum([
        { description: 'dX', value: 'before'},
        { description: 'dX', value: 'after'},
        { description: 'dX', value: false},
      ]),
    },

    VITE_STATIC_VAL_STR: {
      summary: 'cool neat thing',
      sensitive: true,
      // extends: DmnoBaseTypes.string({ startsWith: 'foo_' }),
      description: 'longer text about what this super cool thing is for!',
      value: 'static',
      externalDocs: {
        description: 'explanation from prisma docs',
        url: 'https://www.prisma.io/dataguide/postgresql/short-guides/connection-uris#a-quick-overview'
      },
      ui: {
        // uses iconify names, see https://icones.js.org for options
        icon: 'akar-icons:postgresql-fill',
        color: '336791', // postgres brand color :)
      },
    },
    SWITCH_EXAMPLE: {
<<<<<<< HEAD
      value: switchByNodeEnv({
        _default: 'dev-value',
=======
      value: switchBy('NODE_ENV', {
        _default: 'default-val',
>>>>>>> 5b94fea (dmno config all functioning again!)
        staging: 'staging-value',
        production: (ctx) => `prod-${DMNO_CONFIG.NODE_ENV}`,
      })
    },

    BOOLEAN_EXAMPLE: {
      description: 'this is a required boolean config item',
      required: true,
      value: false,
      ui: {
        icon: 'mdi:minus-circle',
        color: '00FF00'
      }
    },
    BOOLEAN_OPPOSITE: {
      extends: 'boolean',
      value: (ctx) => !DMNO_CONFIG.BOOLEAN_EXAMPLE,
    },

    SIMPLE_OBJECT: {
      extends: 'simpleObject',
      value: { foo: 1, bar: 'biz' },
    },

    RANDOM_NUM: {
      extends: DmnoBaseTypes.number,
      description: 'random number that will change each time config resolution runs',
      required: true,
      value: (ctx) => Math.floor(Math.random() * 100),
    },
    CACHED_RANDOM_NUM: {
      extends: DmnoBaseTypes.number,
      description: 'random number that is cached, so should stay constant until cache is cleared',
      required: true,
      value: cacheFunctionResult((ctx) => Math.floor(Math.random() * 100)),
    },
    VITE_STATIC_VAL_NUM: {
      extends: DmnoBaseTypes.number({
        precision: 1,
        max: 100,
        min: 1
      }),
      value: '12.45',
    },
    WEB_URL: {
      extends: customUrlType({ newSetting: true }),
      description: 'public url of this web app',
      expose: true,
      // required: true,
      // value: 'EXAMPLE',
    },
    ANOTHER: {
      value: 123
    },

    PUBLIC_STATIC: {
      value: 'ps-init',
    },
    PUBLIC_DYNAMIC: {
      dynamic: true,
      value: 'pd-init',
    },

    SECRET_STATIC: {
      sensitive: true,
      value: 'ss-init',
    },
    SECRET_DYNAMIC: {
      sensitive: true,
      dynamic: true,
      value: 'sd-init',
    }
  },
})
