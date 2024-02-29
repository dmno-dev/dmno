import { DmnoBaseTypes, createDmnoDataType, defineConfigSchema } from '@dmno/core';


const customUrlType = createDmnoDataType({
  extends: DmnoBaseTypes.url({}),
  summary: 'summary from custom type',
});

export default defineConfigSchema({
  name: 'web',
  parent: 'group1',
  pick: [
    {
      source: 'api',
      key: 'API_URL',
      renameKey: 'VITE_API_URL',
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
    ARRAY_EXAMPLE: {
      extends: DmnoBaseTypes.array({
        itemSchema: {
          extends: 'number',
        }
      })
    },

    VITE_STATIC_VAL_STR: {
      description: 'this does this thing!',
      value: 'static'
    },
    VITE_STATIC_VAL_NUM: {
      value: 42
    },
    VITE_RANDOM_NUM: {
      extends: DmnoBaseTypes.number,
      value: (ctx) => Math.floor(Math.random() * 100),
    },
    WEB_URL: {
      extends: customUrlType,
      description: 'public url of this web app',
      expose: true,
    }
  },
})