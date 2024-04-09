import { DmnoBaseTypes, defineWorkspaceConfig, configPath, switchByNodeEnv, dmnoFormula, NodeEnvType, switchBy } from '@dmno/core';
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
  name: 'prod',
});
// const NonProdVault = new EncryptedVaultDmnoPlugin('vault/dev', {
//   key: configPath('DMNO_VAULT_KEY'),
// });

export default defineWorkspaceConfig({
  name: 'root',
  schema: {
    NODE_ENV: NodeEnvType, 
    DMNO_ENV: {
      typeDescription: 'standardized environment flag set by DMNO',
      value: (ctx) => ctx.get('NODE_ENV'),
    },


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


    

    VAULT_ITEM_1: {
      value: ProdVault.item(),
    },
    VAULT_ITEM_WITH_SWITCH: {
      extends: DmnoBaseTypes.string({ startsWith: 'abc_' }),
      value: switchByNodeEnv({
        _default: ProdVault.item(),
        staging: ProdVault.item(),
        production: switchBy('ROOT_ONLY', {
          'rootonly': ProdVault.item(),
          'val2': ProdVault.item(),
        }) 
      }),
    },


    ROOT_ONLY: {
      value: 'rootonly',
    },

    PICK_TEST: {
      value: (ctx) => `pick-test--${DMNO_CONFIG.ROOT_ONLY}`,
    },

    // GOOGLE_ANALYTICS_MEASUREMENT_ID: {
    //   extends: GA4MeasurementId,
    //   // required: true,
    //   // value: 'ABC123'
    // },

    // GA_TYPE: {
    //   value: (ctx) => DMNO_CONFIG.GOOGLE_ANALYTICS_MEASUREMENT_ID,
    // },

    // ENUM_EXAMPLE: {  
    //   ui: {
    //     icon: 'bi:apple',
    //     color: 'FF0000'
    //   },
      
    //   extends: DmnoBaseTypes.enum([
    //     { description: 'dX', value: 'before'},
    //     { description: 'dX', value: 'after'},
    //     { description: 'dX', value: false},
    //   ]),
    // },

    // SEGMENT_SECRET: {
    //   extends: DmnoBaseTypes.string,
    //   value: switchByNodeEnv({
    //     // from non prod vault
    //     _default: OnePassBackend.itemByLink("https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=bphvvrqjegfmd5yoz4buw2aequ&h=dmnoinc.1password.com", 'username'),
        
    //     // from prod vault
    //     production: OnePassBackend.itemByLink("https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=bphvvrqjegfmd5yoz4buw2aequ&h=dmnoinc.1password.com", 'username')
    //   })
    // },

    CONTACT_EMAIL: {
      extends: DmnoBaseTypes.email({
        normalize: true,
      }),
      // required: true,
      value: 'Test@test.com'
    },

    SOME_IPV4: {
      extends: DmnoBaseTypes.ipAddress,
      required: true,
      value: '100.200.1.1'
    },

    SOME_IPV6: {
      extends: DmnoBaseTypes.ipAddress({
        version: 6,
        normalize: true,
      }),
      required: true,
      value: '2001:0DB8:85a3:0000:0000:8a2e:0370:7334'
    },

    SOME_PORT: {
      extends: DmnoBaseTypes.port,
      required: true,
      value: '8080'
    },

    SOME_SEMVER: {
      extends: DmnoBaseTypes.semver({
        normalize: true,
      }),
      required: true,
      value: '1.2.3-ALPHA.1'
    },

    SOME_DATE: {
      extends: DmnoBaseTypes.isoDate,
      required: true,
      value: new Date().toISOString()
    },

    SOME_UUID: {
      extends: DmnoBaseTypes.uuid,
      required: true,
      value: '550e8400-e29b-41d4-a716-446655440000'
    },

    SOME_MD5: {
      extends: DmnoBaseTypes.md5,
      required: true,
      value: 'd41d8cd98f00b204e9800998ecf8427e'
    },

    ROOT_ONLY: {
      value: (ctx) => DMNO_CONFIG.DMNO_ENV,
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

    // DB_NAME: {
    //   // value: (ctx) => {
    //   //   return `dmno_${ctx.get('NODE_ENV')}`
    //   // } 
    //   value: dmnoFormula('dmno_{{NODE_ENV}}'),
    //   required: (ctx) => {
    //     return ctx.get('NODE_ENV') === 'production';
    //   }
    // }
  }
});

