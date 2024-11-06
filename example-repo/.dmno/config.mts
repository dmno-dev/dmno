import { DmnoBaseTypes, defineDmnoService, NodeEnvType, switchBy, inject } from 'dmno';
import { OnePasswordDmnoPlugin, OnePasswordTypes } from '@dmno/1password-plugin';
import { BitwardenSecretsManagerDmnoPlugin, BitwardenSecretsManagerTypes } from '@dmno/bitwarden-plugin';
import { InfisicalDmnoPlugin, InfisicalTypes } from '@dmno/infisical-plugin';
import { EncryptedVaultDmnoPlugin, EncryptedVaultTypes } from '@dmno/encrypted-vault-plugin';

const OnePassSecretsProd = new OnePasswordDmnoPlugin('1pass/prod', {
  // token: configPath('..', 'OP_TOKEN_PROD'),
  envItemLink: 'https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=n4wmgfq77mydg5lebtroa3ykvm&h=dmnoinc.1password.com',
  fallbackToCliBasedAuth: true,
});
const OnePassSecretsDev = new OnePasswordDmnoPlugin('1pass', {
  envItemLink: 'https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=4u4klfhpldobgdxrcjwb2bqsta&h=dmnoinc.1password.com',
  fallbackToCliBasedAuth: true,
});

const BitwardenPlugin = new BitwardenSecretsManagerDmnoPlugin('bitwarden');

const InfisicalPlugin = new InfisicalDmnoPlugin('infisical', {
  environment: 'dev',
  clientId: 'bcab88e6-3a4d-4441-bf7c-cce772fd3c57',
  projectId: '4210fecf-247a-419f-beda-bfd5e11f6ce0',
  // secret is injected
});

const EncryptedVaultSecrets = new EncryptedVaultDmnoPlugin('vault/prod', { name: 'prod', key: inject() });
// const ProdEncryptedVaultSecrets = new EncryptedVaultDmnoPlugin('vault/prod', { name: 'prod', key: inject() });

export default defineDmnoService({
  name: 'root',
  isRoot: true,
  settings: {
    interceptSensitiveLeakRequests: true,
    redactSensitiveLogs: true,
    preventClientLeaks: true,
  },
  schema: {
    ITEM_X: { 
      value: 'should-be-required',
    },

    NODE_ENV: NodeEnvType,
    DMNO_ENV: {
      typeDescription: 'standardized environment flag set by DMNO',
      value: (ctx) => ctx.get('NODE_ENV'),
    },
    INFISICAL_CLIENT_SECRET: {
      extends: InfisicalTypes.clientSecret,
      value: EncryptedVaultSecrets.item(),
    },
    INFISICAL_ITEM_AVAILABE_ALL_ENVS: {
      value: InfisicalPlugin.secret('TEST_KEY_ALL_ENVS'),
    },
    INFISICAL_ITEM_AVAILABE_DEV_ENV_ONLY: {
      value: InfisicalPlugin.secret('DEV_ONLY'),
    },
    REDACT_TEST: {
      sensitive: true,
      value: 'a a a a b b b b c c c c d d d',
      coerce: (val) => val.replaceAll(' ', ''),
    },
    OP_TOKEN: {
      extends: OnePasswordTypes.serviceAccountToken,
    },
    OP_ITEM_1: {
      value: switchBy('DMNO_ENV', {
        _default: OnePassSecretsDev.item(),
        production: OnePassSecretsProd.item(),
      }),
    },
    OP_ITEM_BY_ID: {
      value: OnePassSecretsDev.itemById("ut2dftalm3ugmxc6klavms6tfq", "bphvvrqjegfmd5yoz4buw2aequ", "username"),
    },
    OP_ITEM_BY_LINK: {
      value: OnePassSecretsDev.itemByLink("https://start.1password.com/open/i?a=I3GUA2KU6BD3FBHA47QNBIVEV4&v=ut2dftalm3ugmxc6klavms6tfq&i=bphvvrqjegfmd5yoz4buw2aequ&h=dmnoinc.1password.com", "helturjryuy73yjbnaovlce5fu"),
    },
    OP_ITEM_BY_REFERENCE: {
      value: OnePassSecretsDev.itemByReference("op://dev test/example/username"),
    },

    BWS_TOKEN: {
      extends: BitwardenSecretsManagerTypes.machineAccountAccessToken,
      value: EncryptedVaultSecrets.item(),
    },
    BWS_ITEM: {
      value: BitwardenPlugin.secretById('df2246f1-7889-4d1b-a18e-b219001ee3b3'),
    },

    SOME_API_KEY: {
      value: switchBy('DMNO_ENV', {
        _default: OnePassSecretsDev.item(),
        production: OnePassSecretsProd.item(),
      }),
    },

    DMNO_VAULT_KEY: {
      extends: EncryptedVaultTypes.encryptionKey,
    },

    ROOT_ONLY: {
      value: 'rootonly',
    },

    CONTEXT: { value: 'branch-preview' },

    VAULT_ITEM_1: {
      value: EncryptedVaultSecrets.item(),
    },
    VAULT_ITEM_WITH_SWITCH: {
      value: switchBy('NODE_ENV', {
        _default: EncryptedVaultSecrets.item(),
        staging: switchBy('CONTEXT', {
          _default: undefined,
          'branch-preview': EncryptedVaultSecrets.item(),
          'pr-preview': EncryptedVaultSecrets.item(),
        }),
        production: EncryptedVaultSecrets.item()
      }),
    },

    PICK_TEST: {
      value: () => `pick-test--${DMNO_CONFIG.ROOT_ONLY}`,
    },

    CONTACT_EMAIL: {
      extends: DmnoBaseTypes.email({
        normalize: true,
      }),
      value: 'Test@test.com'
    },

    SOME_IPV4: {
      extends: DmnoBaseTypes.ipAddress,
      value: '100.200.1.1'
    },

    SOME_IPV6: {
      extends: DmnoBaseTypes.ipAddress({
        version: 6,
        normalize: true,
      }),
      value: '2001:0DB8:85a3:0000:0000:8a2e:0370:7334'
    },

    SOME_PORT: {
      extends: DmnoBaseTypes.port,
      value: '8080'
    },

    SOME_SEMVER: {
      extends: DmnoBaseTypes.semver({
        normalize: true,
      }),
      value: '1.2.3-ALPHA.1'
    },

    SOME_DATE: {
      extends: DmnoBaseTypes.isoDate,
      value: new Date().toISOString()
    },

    SOME_UUID: {
      extends: DmnoBaseTypes.uuid,
      value: '550e8400-e29b-41d4-a716-446655440000'
    },

    SOME_MD5: {
      extends: DmnoBaseTypes.md5,
      value: 'd41d8cd98f00b204e9800998ecf8427e'
    },
  }
});

