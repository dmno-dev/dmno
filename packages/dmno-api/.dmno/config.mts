import { DmnoBaseTypes, defineDmnoService, configPath, switchBy, pickFromSchemaObject } from 'dmno';
import { CloudflareWranglerEnvSchema, DmnoWranglerEnvSchema } from '@dmno/cloudflare-platform';
import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';

const onepass = new OnePasswordDmnoPlugin('1pass', { fallbackToCliBasedAuth: true });

export default defineDmnoService({
  name: 'api',
  schema: {
    ...pickFromSchemaObject(DmnoWranglerEnvSchema, {
      WRANGLER_ENV: {},
    }),
    ...pickFromSchemaObject(CloudflareWranglerEnvSchema, {
      CLOUDFLARE_ACCOUNT_ID: {
        value: onepass.itemByReference("op://API secrets/cloudflare/CLOUDFLARE_ACCOUNT_ID")
      },
      CLOUDFLARE_API_TOKEN: {
        value: onepass.itemByReference("op://API secrets/cloudflare/CLOUDFLARE_API_TOKEN")
      },
    }),
    MAILERLITE_TOKEN: {
      sensitive: true,
      required: true,
      value: onepass.itemByReference("op://API secrets/mailerlite/MAILERLITE_TOKEN")
    },
    MAILERLITE_GROUP_ID: {
      value: '112994107484276105',
      description: "The MailerLite group ID to add new subscribers to",
      externalDocs: {
        url: 'https://dashboard.mailerlite.com/subscribers?rules=W1t7Im9wZXJhdG9yIjoiaW5fYW55IiwiY29uZGl0aW9uIjoiZ3JvdXBzIiwiYXJncyI6WyJncm91cHMiLFsiMTEyOTk0MTA3NDg0Mjc2MTA1Il1dfV1d&group=112994107484276105&status=active',
        description: 'Group: All Subs'
      }
    },
  }
});
