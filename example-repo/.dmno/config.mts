import { DmnoBaseTypes, defineWorkspaceConfig, configPath, switchByNodeEnv, dmnoFormula, createDmnoDataType, NodeEnvType, registerPlugin, InjectPluginInputByType } from '@dmno/core';
import { OnePasswordDmnoPlugin, OnePasswordTypes } from '@dmno/1password-plugin';

// TODO: figure out how to get rid of mjs extension
import { GA4MeasurementId } from './custom-types.mjs';

const ProdOnePassBackend = registerPlugin(new OnePasswordDmnoPlugin({
  token: configPath('OP_TOKEN'),
  defaultVaultName: 'dev test',
}));

export default defineWorkspaceConfig({
  schema: {
    NODE_ENV: NodeEnvType, 
    DMNO_ENV: {
      typeDescription: 'standardized environment flag set by DMNO',
      value: (ctx) => ctx.get('NODE_ENV'),
    },
    PICK_TEST: {
      // value: (ctx) => `pick-test--${DMNO_CONFIG. }`,
    },

    GOOGLE_ANALYTICS_MEASUREMENT_ID: {
      extends: GA4MeasurementId,
      required: true,
      value: 'ABC123'
    },

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


    ROOT_ONLY: {
      value: (ctx) => DMNO_CONFIG.NODE_ENV,
    },

    OP_TOKEN: {
      extends: OnePasswordTypes.serviceAccountToken,
      required: true
    },

    ONE_PASSWORD: {
      description: '1password creds and vault',
      extends: DmnoBaseTypes.object({
        SERVICE_ACCOUNT_TOKEN: {
          description: 'token used to access a 1password service account',
          extends: DmnoBaseTypes.string({}),
          // required: true,
        },
        VAULT_ID: {
          description: 'ID of the vault we store our secrets in',
          extends: DmnoBaseTypes.string(),
        },
      }),
      // required: true,
    },

    SEGMENT_SECRET: {
      extends: DmnoBaseTypes.string,
      value: switchByNodeEnv({
        _default: 'asdfasdfasdf',
        staging: ProdOnePassBackend.itemByReference("op://dev test/segment/staging"),
        production: ProdOnePassBackend.itemByReference("op://dev test/segment/prod")
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

