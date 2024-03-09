import { DmnoBaseTypes, createDmnoDataType, defineConfigSchema, dmnoFormula, toggleByEnv, toggleByNodeEnv } from '@dmno/core';


const customUrlType = createDmnoDataType({
  extends: DmnoBaseTypes.url({}),
  summary: 'summary from custom type',
});


export default defineConfigSchema({
  name: 'web',
  parent: 'group1',
  pick: [
    'NODE_ENV',
    'DMNO_ENV',
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
    OBJECT_EXAMPLE: {
      extends: DmnoBaseTypes.object({
        child1: {
          extends: 'number',
          value: 123
        },
        child2: {
          extends: 'boolean',
          value: true,
        },
      })
    },

    VITE_STATIC_VAL_STR: {
      description: 'this does this thing!',
      value: 'static'
    },
    TOGGLE_EXAMPLE: {
      value: toggleByNodeEnv({
        _default: 'default-val',
        staging: 'staging-value',
        production: (ctx) => `prod-${ctx.get('NODE_ENV')}`,
      })
    },
    VITE_RANDOM_NUM: {
      extends: DmnoBaseTypes.number,
      // generate a random number, will be different each time resolution runs
      // (eventually we'll have some caching and rules around that...)
      value: (ctx) => Math.floor(Math.random() * 100),
    },
    VITE_STATIC_VAL_NUM: {
      extends: DmnoBaseTypes.number({
        precision: 1,
        max: 1000,
        min: 1,
      }),
      value: (ctx) => {
        return ctx.get('VITE_RANDOM_NUM') + 1;
      },
    },
    WEB_URL: {
      extends: customUrlType,
      description: 'public url of this web app',
      expose: true,
    },
  },
})
