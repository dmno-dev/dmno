import { DmnoBaseTypes, defineWorkspaceConfig, configPath, toggleByEnv, dmnoFormula, createDmnoDataType, NodeEnvType } from '@dmno/core';
import { OnePasswordSecretService } from '@dmno/1password-plugin';

const OnePassBackend = new OnePasswordSecretService(
  configPath('ONE_PASSWORD.SERVICE_ACCOUNT_TOKEN'),
);


export default defineWorkspaceConfig({
  schema: {
    NODE_ENV: NodeEnvType, 
    DMNO_ENV: {
      value: (ctx) => ctx.get('NODE_ENV'),
    },
    PICK_TEST: {
      value: (ctx) => `pick-test--${ctx.get('NODE_ENV')}`,
    },

    ONE_PASSWORD: {
      description: '1password creds and vault',
      extends: DmnoBaseTypes.object({
        SERVICE_ACCOUNT_TOKEN: {
          description: 'token used to access a 1password service account',
          extends: DmnoBaseTypes.string({}),
          required: true,
        },
        VAULT_ID: {
          description: 'ID of the vault we store our secrets in',
          extends: DmnoBaseTypes.string(),
        },
      }),
      required: true,
    },

    SEGMENT_SECRET: {
      extends: DmnoBaseTypes.string,
      value: toggleByEnv({
        _default: 'asdfasdfasdf',
        staging: OnePassBackend.itemByReference("op://dev test/segment/staging"),
        production: OnePassBackend.itemByReference("op://dev test/segment/prod")
      })
    },

    DB_NAME: {
      // value: (ctx) => {
      //   return `dmno_${ctx.get('NODE_ENV')}`
      // } 
      value: dmnoFormula('dmno_{{NODE_ENV}}'),
      required: (ctx) => {
        return ctx.get('NODE_ENV') === 'production';
      }
    }
  }
});

