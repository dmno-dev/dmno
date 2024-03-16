import { DmnoBaseTypes, DmnoDataType, DmnoDataTypeFactoryFn, ExtractSettingsSchema, createDmnoDataType, defineConfigSchema, dmnoFormula, toggleByEnv, toggleByNodeEnv } from '@dmno/core';


const customUrlType = createDmnoDataType({
  typeLabel: 'my-custom-url',
  extends: DmnoBaseTypes.url({
    prependProtocol: true,
    normalize: true,
  }),
  summary: 'summary from custom type',
  
  settingsSchema: Object as {
    newSetting?: boolean,
  },
});

// const customizedStringType = createDmnoDataType({
//   typeLabel: 'my-custom-url',
//   extends: (settings) => DmnoBaseTypes.string({
//     ...settings,
//   }),
//   summary: 'summary from custom type',
  
//   settingsSchema: Object as {
//     newSetting?: boolean,
//   } & ExtractSettingsSchema<typeof DmnoBaseTypes.string>,

//   validate(val, settings) {
//     console.log(settings.newSetting);
//     console.log(settings.minLength);
//   }
// });


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
          value: 121
        },
        child2: {
          value: true,
        },
      })
    },

    VITE_STATIC_VAL_STR: {
      // extends: DmnoBaseTypes.string({ startsWith: 'foo_' }),
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

    BOOLEAN_EXAMPLE: {
      description: 'this is a required boolean config item',
      required: true,
      value: true,
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
        max: 100,
        min: 1
      }),
      value: '123.45',
    },
    WEB_URL: {
      extends: customUrlType({ newSetting: true }),
      description: 'public url of this web app',
      expose: true,
      // required: true,
      // value: 'EXAMPLE',
    },
  },
})
