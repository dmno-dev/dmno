import { DmnoBaseTypes, defineWorkspaceConfig, configPath, switchByNodeEnv, dmnoFormula, NodeEnvType, registerPlugin } from '@dmno/core';
import { OnePasswordDmnoPlugin, OnePasswordTypes } from '@dmno/1password-plugin';
import { EncryptedVaultDmnoPlugin, EncryptedVaultTypes } from '@dmno/encrypted-vault-plugin';

// TODO: figure out how to get rid of mjs extension
import { GA4MeasurementId } from './custom-types.mjs';

const ProdOnePassBackend = registerPlugin(new OnePasswordDmnoPlugin({
  token: configPath('OP_TOKEN'),
  // token: InjectPluginInputByType,
  // token: 'asdf',
  defaultVaultName: 'dev test',
}))

const NonProdVault = registerPlugin(new EncryptedVaultDmnoPlugin({
  key: configPath('DMNO_VAULT_KEY'),
}));
const ProdVault = registerPlugin('prod', new EncryptedVaultDmnoPlugin({
  name: 'prod',
  key: configPath('DMNO_VAULT_KEY'),
}));


export default defineWorkspaceConfig({
  name: 'root',
  schema: {
    OP_TOKEN: {
      extends: OnePasswordTypes.serviceAccountToken,
      required: true
    },

    DMNO_VAULT_KEY: {
      extends: EncryptedVaultTypes.encryptionKey,
      required: true,
      value: 'asdf',
    },

    VAULT_TEST: {
      value: NonProdVault.item(),
    },

    NODE_ENV: NodeEnvType, 
    DMNO_ENV: {
      typeDescription: 'standardized environment flag set by DMNO',
      value: (ctx) => ctx.get('NODE_ENV'),
    },

    ROOT_ONLY: {
      value: 'ROOTONLY',
    },

    PICK_TEST: {
      value: (ctx) => `pick-test--${DMNO_CONFIG.ROOT_ONLY}`,
    },

    GOOGLE_ANALYTICS_MEASUREMENT_ID: {
      extends: GA4MeasurementId,
      // required: true,
      // value: 'ABC123'
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

