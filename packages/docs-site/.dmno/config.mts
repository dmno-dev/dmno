import { DmnoBaseTypes, defineDmnoService, switchBy, pickFromSchemaObject, pick } from 'dmno';
import { CloudflarePagesEnvSchema } from '@dmno/cloudflare-platform';

export default defineDmnoService({
  name: 'docs-site',
  settings: {
    interceptSensitiveLeakRequests: true,
    redactSensitiveLogs: true,
    preventClientLeaks: true,
  },
  schema: {
    GITHUB_REPO_URL: pick(),
    GITHUB_ACTION_REPO_URL: pick(),
    DISCORD_JOIN_URL: pick(),
    GENERAL_CONTACT_EMAIL: pick(),
    POSTHOG_API_KEY: pick(),
    GOOGLE_TAG_MANAGER_ID: {
      value: 'G-361VY1ET7B',
    },
    GOOGLE_FONT_FAMILIES: {
      value: 'family=Days+One&family=Fira+Mono:wght@400&family=Inter:wght@100..900'
    },

    ...pickFromSchemaObject(CloudflarePagesEnvSchema, 'CF_PAGES_BRANCH'),

    DMNO_ENV: {
      value: () => {
        if (DMNO_CONFIG.CF_PAGES_BRANCH === 'main') return 'production';
        if (DMNO_CONFIG.CF_PAGES_BRANCH) return 'staging';
        return 'local';
      },
    },

    SIGNUP_API_URL: {
      value: 'https://signup-api.dmno.dev',
    },

    SCARF_PIXEL_ID: {
      description: 'analytics pixel scarf.sh',
      value: switchBy('DMNO_ENV', {
        _default: undefined,
        production: '58b1912e-d54f-4c10-9f07-1d4a4e63e2eb',
      }),
    }
  }
});
