import { DmnoBaseTypes, defineDmnoService, configPath, switchBy, pickFromSchemaObject } from 'dmno';
import { CloudflareWranglerEnvSchema, DmnoWranglerEnvSchema } from '@dmno/cloudflare-platform';
import { EncryptedVaultDmnoPlugin, EncryptedVaultTypes } from '@dmno/encrypted-vault-plugin';
import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';

const EncryptedVault = new EncryptedVaultDmnoPlugin('vault', {
  key: configPath('..', 'DMNO_VAULT_KEY'),
  name: 'prod',
});

const onepass = new OnePasswordDmnoPlugin('1pass', {
  fallbackToCliBasedAuth: true
});


export default defineDmnoService({
  name: 'signup-api',
  schema: {
    ...pickFromSchemaObject(CloudflareWranglerEnvSchema, {
      CLOUDFLARE_ACCOUNT_ID: {
        value: onepass.itemByReference("op://Shared/Cloudflare/account id"),
      },
      CLOUDFLARE_API_TOKEN: {
        value: onepass.itemByReference("op://Shared/Cloudflare/workers api token"),
      },
    }),

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
    MAILERLITE_GROUP_ID: {
      value: '112994107484276105',
      description: "The MailerLite group ID to add new subscribers to",
      externalDocs: {
        url: 'https://dashboard.mailerlite.com/subscribers?rules=W1t7Im9wZXJhdG9yIjoiaW5fYW55IiwiY29uZGl0aW9uIjoiZ3JvdXBzIiwiYXJncyI6WyJncm91cHMiLFsiMTEyOTk0MTA3NDg0Mjc2MTA1Il1dfV1d&group=112994107484276105&status=active',
        description: 'Group: All Subs'
      }
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
