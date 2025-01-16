import { DmnoBaseTypes, defineDmnoService, switchBy, configPath, pick } from 'dmno';
import { OnePasswordDmnoPlugin, OnePasswordTypes } from '@dmno/1password-plugin';

// use plugins to fetch sensitive config from secure locations like 1Password
const onePassSecrets = new OnePasswordDmnoPlugin('1pass', { token: configPath('OP_TOKEN') });

export default defineDmnoService({
  schema: {
    APP_ENV: {
      // docs are built in, and flow into generated TypeScript types / IntelliSense
      description: 'our custom environment flag',
      extends: DmnoBaseTypes.enum(['development', 'preview', 'staging', 'production', 'test']),
      value: 'development', // default value
    },
    SAAS_API_KEY: {
      // built-in types have validation helpers for many common needs
      extends: DmnoBaseTypes.string({ startsWith: 'pk_', isLength: 35 }),
      // sensitive items get special handling to prevent leaks
      sensitive: true,
      // load different values based on any other value
      value: switchBy('APP_ENV', {
        _default: 'my-dev-key',
        production: onePassSecrets.item(),
      }),
    },
    LOGS_TAG: {
      // use a function to set a value - reference any other config
      value: () => `myapp-frontend_${DMNO_CONFIG.APP_ENV}`,
    },
    PORT: {
      extends: DmnoBaseTypes.port, // pre-made types built-in for many common cases
      value: 4444,
    },
    // re-use config from other services (if in a monorepo)
    API_URL: pick('api', 'PUBLIC_URL'),
    OP_TOKEN: {
      // re-use existing types with validation and docs info already built-in
      extends: OnePasswordTypes.serviceAccountToken,
    },
  },
});
