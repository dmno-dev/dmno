import { DmnoBaseTypes, defineDmnoService, switchByNodeEnv, configPath, switchBy, pickFromSchemaObject } from 'dmno';
import { NetlifyEnvSchema } from '@dmno/netlify-platform/types';

export default defineDmnoService({
  name: 'docs-site',
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
      value: 'family=Days+One&family=Fira+Code:wght@300&family=Inter:wght@100..900'
    },
    
    ...pickFromSchemaObject(NetlifyEnvSchema, 'CONTEXT', 'BUILD_ID'),

    DMNO_ENV: {
      value: switchBy('CONTEXT', {
        _default: 'local',
        'deploy-preview': 'staging',
        'branch-deploy': 'staging',
        production: 'production',
      }),
    },
    SIGNUP_API_URL: {
      value: 'https://signup-api.dmno.dev',
    },
  }
});
