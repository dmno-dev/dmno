import { defineConfigSchema, DmnoBaseTypes, NodeEnvType, configPath, dmnoFormula, toggleByEnv, valueCreatedDuringDeployment, cacheValue } from '@dmno/core';
import { OnePasswordSecretService } from '@dmno/1password-plugin';

const DevOnePassBackend = new OnePasswordSecretService(
  configPath('OP_TOKEN'),
  { defaultVaultName: 'dev test' }
);

const ProdOnePassBackend = new OnePasswordSecretService(
  configPath('OP_TOKEN'),
  { defaultVaultName: 'dev test' }
);

export default defineConfigSchema({
  name: 'api',
  parent: 'group1',
  pick: [
    'NODE_ENV',
    'DMNO_ENV',
    'ONE_PASSWORD',
    'OP_TOKEN'
  ],
  schema: {
    SECRET_EXAMPLE: {
      value: DevOnePassBackend.itemByReference("op://dev test/example/username"),
    },
    TOGGLED_EXAMPLE: {
      value: toggleByEnv({
        _default: DevOnePassBackend.itemByReference("example/username"),
        staging: DevOnePassBackend.itemByReference("example/username"),
        production: ProdOnePassBackend.itemByReference("example/username"),
      }),
    },


    PORT: {
      value: 8081,
    },
    API_URL: {
      description: 'public url of this service',
      extends: DmnoBaseTypes.string({}),
      // expose: true,
      // value: toggleByEnv({
      //   _default: (ctx) => `http://localhost:${ctx.get('PORT')}`,
      //   staging: valueCreatedDuringDeployment(),
      //   production: 'https://api.dmnoexampleapp.com',
      // })
    }
  },
});
