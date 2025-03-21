import { DmnoBaseTypes, cacheFunctionResult, createDmnoDataType, defineDmnoService, switchBy, pick } from 'dmno';
import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';

const OnePassBackend = OnePasswordDmnoPlugin.injectInstance('1pass');

const customUrlType = createDmnoDataType(
  ({ newSetting: boolean }) => ({
    typeLabel: 'my-custom-url',
    extends: DmnoBaseTypes.url({
      prependProtocol: true,
      normalize: true,
    }),
    summary: 'summary from custom type',
  })
);

export default defineDmnoService({
  name: 'web',
  parent: 'group1',
  icon: 'file-icons:vite',
  settings: {
    dynamicConfig: 'only_static',
  },
  schema: {

    NODE_ENV: pick(),
    DMNO_ENV: pick(),
    VITE_API_URL: pick('api', 'API_URL'),
    PICK_TEST_W: {
      extends: pick('group1', 'PICK_TEST_G1'),
      // TODO: reimplement
      // transformValue: (val) => `${val}-webtransform`,
    },

    // OP_ITEM_1: {
    //   sensitive: true,
    //   value: OnePassBackend.item(),
    // },

    // EX1: {
    //   value: () => DMNO_CONFIG.BOOLEAN_EXAMPLE,
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
      value: switchBy('NODE_ENV', {
        _default: 'default-val',
        staging: 'staging-value',
        production: () => `prod-${DMNO_CONFIG.NODE_ENV}`,
      })
    },

    BOOLEAN_EXAMPLE: {
      description: 'this is a required boolean config item',
      required: true,
      value: false,
    },
    BOOLEAN_OPPOSITE: {
      extends: 'boolean',
      value: () => !DMNO_CONFIG.BOOLEAN_EXAMPLE,
    },

    SIMPLE_OBJECT: {
      extends: 'simpleObject',
      value: { foo: 1, bar: 'biz' },
    },

    RANDOM_NUM: {
      extends: DmnoBaseTypes.number,
      description: 'random number that will change each time config resolution runs',
      required: true,
      value: () => Math.floor(Math.random() * 100),
    },
    CACHED_RANDOM_NUM: {
      extends: DmnoBaseTypes.number,
      description: 'random number that is cached, so should stay constant until cache is cleared',
      required: true,
      value: cacheFunctionResult(() => Math.floor(Math.random() * 100)),
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
