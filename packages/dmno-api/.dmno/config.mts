import { DmnoBaseTypes, defineDmnoService, configPath, switchBy, pickFromSchemaObject } from 'dmno';
import { CloudflarePagesEnvSchema, CloudflareWranglerEnvSchema, DmnoWranglerEnvSchema } from '@dmno/cloudflare-platform';
import { EncryptedVaultDmnoPlugin, EncryptedVaultTypes } from '@dmno/encrypted-vault-plugin';
// import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';

// we'll just use a single vault for now since it only has the 1 key - can split prod/staging later
const EncryptedVault = new EncryptedVaultDmnoPlugin('vault', {
  key: configPath('..', 'DMNO_VAULT_KEY'),
  name: 'prod',
});

// const onepass = new OnePasswordDmnoPlugin('1pass', { fallbackToCliBasedAuth: true });


export default defineDmnoService({
  name: 'api',
  schema: {
    // these may be useful if we move over to workers, or move to another CI
    // ...pickFromSchemaObject(CloudflareWranglerEnvSchema, {
    //   CLOUDFLARE_ACCOUNT_ID: {
    //     value: onepass.itemByReference("op://Shared/Cloudflare/account id"),
    //   },
    //   CLOUDFLARE_API_TOKEN: {
    //     value: onepass.itemByReference("op://Shared/Cloudflare/workers api token"),
    //   },
    // }),
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
    ...pickFromSchemaObject(CloudflarePagesEnvSchema, 'CF_PAGES_BRANCH'),

    DMNO_ENV: {
      value: () => {
        if (DMNO_CONFIG.CF_PAGES_BRANCH === 'main') return 'production';
        if (DMNO_CONFIG.CF_PAGES_BRANCH) return 'staging';
        return 'local';
      },
    },
  }
});
