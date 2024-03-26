import { defineConfigSchema, DmnoBaseTypes, NodeEnvType, configPath, dmnoFormula, switchByNodeEnv, valueCreatedDuringDeployment, cacheValue, injectPlugin } from '@dmno/core';
import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';

const OnePassBackend = injectPlugin(OnePasswordDmnoPlugin);


export default defineConfigSchema({
  name: 'api',
  parent: 'group1',
  pick: [
    'NODE_ENV',
    'DMNO_ENV',
    'OP_TOKEN',
  ],
  schema: {
    CHECK: {
      value: (ctx) => DMNO_CONFIG.OP_TOKEN,
    },
    SECRET_EXAMPLE: {
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
      value: 'api'
    },

    PORT: {
      extends: DmnoBaseTypes.number({ max: 9999 }),
      value: '9000',
    },
    API_URL: {
      description: 'public url of this service',
      extends: DmnoBaseTypes.string({}),
      // expose: true,
      // value: switchByNodeEnv({
      //   _default: (ctx) => `http://localhost:${ctx.get('PORT')}`,
      //   staging: valueCreatedDuringDeployment(),
      //   production: 'https://api.dmnoexampleapp.com',
      // })
    }
  },
});
