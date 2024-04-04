import { DmnoBaseTypes, defineWorkspaceConfig, configPath, switchByNodeEnv, dmnoFormula, NodeEnvType } from '@dmno/core';
import { OnePasswordDmnoPlugin, OnePasswordTypes } from '@dmno/1password-plugin';
import { EncryptedVaultDmnoPlugin, EncryptedVaultTypes } from '@dmno/encrypted-vault-plugin';

// TODO: figure out how to get rid of mjs extension
import { GA4MeasurementId } from './custom-types.mjs';





const OnePassBackend = new OnePasswordDmnoPlugin('1pass', {
  token: configPath('OP_TOKEN'),
  envItemLink: 'https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=n4wmgfq77mydg5lebtroa3ykvm&h=dmnoinc.1password.com'
  // token: InjectPluginInputByType,
  // token: 'asdf',
});


const ProdVault = new EncryptedVaultDmnoPlugin('vault/prod', {
  key: configPath('DMNO_VAULT_KEY'),
});
const NonProdVault = new EncryptedVaultDmnoPlugin('vault/dev', {
  key: configPath('DMNO_VAULT_KEY'),
});

export default defineWorkspaceConfig({
  name: 'root',
  schema: {
    OP_TOKEN: {
      extends: OnePasswordTypes.serviceAccountToken,
    },
    OP_TOKEN_PROD: {
      extends: OnePasswordTypes.serviceAccountToken,
    },

    DMNO_VAULT_KEY: {
      extends: EncryptedVaultTypes.encryptionKey,
      // required: true
    },

    OP_ITEM_1: {
      value: OnePassBackend.item(),
    },

    NODE_ENV: NodeEnvType, 
    DMNO_ENV: {
      typeDescription: 'standardized environment flag set by DMNO',
      value: (ctx) => ctx.get('NODE_ENV'),
    },

    ROOT_ONLY: {
      value: 'rootonly',
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
        // from non prod vault
        _default: OnePassBackend.itemByLink("https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=bphvvrqjegfmd5yoz4buw2aequ&h=dmnoinc.1password.com", 'username'),
        
        // from prod vault
        production: OnePassBackend.itemByLink("https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=bphvvrqjegfmd5yoz4buw2aequ&h=dmnoinc.1password.com", 'username')
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

