import { DmnoBaseTypes, defineDmnoService, configPath, switchBy } from 'dmno';
import { EncryptedVaultDmnoPlugin, EncryptedVaultTypes } from '@dmno/encrypted-vault-plugin';

const EncryptedVault = new EncryptedVaultDmnoPlugin('vault', {
  key: configPath('..', 'DMNO_VAULT_KEY'),
  name: 'prod',
});

export default defineDmnoService({
  name: 'signup-api',
  pick: [],
  schema: {
    DMNO_ENV: { // TODO: formalize this
      // will be overridden by netlify during deploys - see netlify.toml
      value: 'development',
    },
    DMNO_VAULT_KEY: {
      extends: EncryptedVaultTypes.encryptionKey,
      required: true,
    },
    MAILERLITE_TOKEN: {
      sensitive: true,
      required: true,
      value: EncryptedVault.item(),
    },
    SIGNUPS_GOOGLE_SHEET_ID: {
      value: EncryptedVault.item(),
    },
    GOOGLE_SHEETS_ACCOUNT_EMAIL: {
      value: EncryptedVault.item(),
    },
    GOOGLE_SHEETS_ACCOUNT_KEY: {
      sensitive: true,
      value: EncryptedVault.item(),
    },

    // TODO: move to netlify "preset" (set of env vars)
    DEPLOY_PRIME_URL: {
      extends: 'url',
      description: 'URL representing the primary URL for an individual deploy, or a group of them, like branch deploys and Deploy Previews',
      externalDocs: {
        url: 'https://docs.netlify.com/configure-builds/environment-variables/#deploy-urls-and-metadata',
        description: 'netlify docs'
      }
    },

    SIGNUP_API_URL: {
      extends: 'url',
      value: switchBy('DMNO_ENV', {
        _default: 'http://localhost:8888',
        staging: () => DMNO_CONFIG.DEPLOY_PRIME_URL,
        production: 'https://signup-api.dmno.dev',
      }),
      expose: true,
    }
  }
});
