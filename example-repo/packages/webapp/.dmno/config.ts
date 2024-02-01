import { defineConfigSchema } from '@dmno/core';



defineConfigSchema({
  pick: [
    {
      source: 'api',
      key: 'API_URL',
    },
  ],
  schema: {

  },
  output: {
    WEB_URL: {
      description: 'public url of this web app'
    }
  }
})