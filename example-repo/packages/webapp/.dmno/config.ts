import { DmnoBaseTypes, defineConfigSchema } from '@dmno/core';



export default defineConfigSchema({
  name: 'web',
  pick: [
    {
      source: 'api',
      key: 'API_URL',
    },
  ],
  schema: {
    VITE_STATIC_VAL_STR: {
      value: 'static'
    },
    VITE_STATIC_VAL_NUM: {
      extends: DmnoBaseTypes.number({}),
      value: 42
    },
    VITE_RANDOM_NUM: {
      extends: DmnoBaseTypes.number({}),
      value: (ctx) => Math.floor(Math.random() * 100),
    }
  },
  output: {
    WEB_URL: {
      description: 'public url of this web app'
    }
  }
})