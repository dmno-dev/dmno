import { DmnoBaseTypes, defineDmnoService, configPath, switchByNodeEnv, NodeEnvType, switchBy } from 'dmno';
import { OnePasswordDmnoPlugin, OnePasswordTypes } from '@dmno/1password-plugin';
import { EncryptedVaultDmnoPlugin, EncryptedVaultTypes } from '@dmno/encrypted-vault-plugin';



const OnePassBackend = new OnePasswordDmnoPlugin('1pass', {
  token: configPath('OP_TOKEN'),
  envItemLink: 'https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=n4wmgfq77mydg5lebtroa3ykvm&h=dmnoinc.1password.com',
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



export default defineDmnoService({
  name: 'root',
  isRoot: true,
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

    ROOT_ONLY: {
      value: 'rootonly',
    },

    VAULT_ITEM_1: {
      value: ProdVault.item(),
    },
    VAULT_ITEM_WITH_SWITCH: {
      value: switchByNodeEnv({
        _default: ProdVault.item(),
        staging: ProdVault.item(),
        production: switchBy('ROOT_ONLY', {
          'rootonly': ProdVault.item(),
          'val2': ProdVault.item(),
        }) 
      }),
    },

    PICK_TEST: {
      value: (ctx) => `pick-test--${DMNO_CONFIG.ROOT_ONLY}`,
    },

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
  }
});

