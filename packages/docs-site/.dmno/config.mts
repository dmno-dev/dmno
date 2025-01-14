import { DmnoBaseTypes, defineDmnoService, switchBy, pickFromSchemaObject } from 'dmno';
import { CloudflarePagesEnvSchema } from '@dmno/cloudflare-platform';

export default defineDmnoService({
  name: 'docs-site',
  settings: {
    interceptSensitiveLeakRequests: true,
    redactSensitiveLogs: true,
    preventClientLeaks: true,
  },
  pick: [
    'GITHUB_REPO_URL',
    'DISCORD_JOIN_URL',
    'GENERAL_CONTACT_EMAIL',
    'POSTHOG_API_KEY',
  ],
  schema: {
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
  }
});
