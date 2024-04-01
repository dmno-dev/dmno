import { defineConfigSchema, DmnoBaseTypes, NodeEnvType, configPath, dmnoFormula, switchByNodeEnv, cacheValue, injectPlugin, createDmnoDataType } from '@dmno/core';
import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';

const OnePassBackend = injectPlugin(OnePasswordDmnoPlugin);


const newtype = createDmnoDataType({

})

export default defineConfigSchema({
  name: 'api',
  parent: 'group1',
  pick: [
    'NODE_ENV',
    'DMNO_ENV',
  ],
  schema: {
    SECRET_EXAMPLE: {
      extends: DmnoBaseTypes.string,
      required: true,
      value: OnePassBackend.itemByReference("op://dev test/example/username"),
    },
    SWITCHED_EXAMPLE: {
      value: switchByNodeEnv({
        _default: OnePassBackend.itemByReference("example/username"),
        staging: OnePassBackend.itemByReference("example/username"),
        production: OnePassBackend.itemByReference("example/username"),
      }),
    },

    API_ONLY: {
      value: 'set via dmno'
    },

    PORT: {
      description: 'port number to listen on',
      extends: DmnoBaseTypes.number({ max: 9999 }),
      required: true,
      value: 9000,
    },
    API_URL: {
      description: 'public url of this service',
      extends: DmnoBaseTypes.string({}),
      expose: true,
      value: switchByNodeEnv({
        _default: (ctx) => `http://localhost:${DMNO_CONFIG.PORT}`,
        // staging: valueCreatedDuringDeployment(),
        production: 'https://api.dmnoexampleapp.com',
      })
    }
  },
});
