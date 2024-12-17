import { DmnoBaseTypes, createDmnoDataType, createVendorSchema } from 'dmno';
import { GitDataTypes } from 'dmno/vendor-types';

function getCommonPagesTypeInfo(skipIcon = false) {
  return {
    externalDocs: {
      url: 'https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables',
      description: 'Cloudflare Pages docs - env vars',
    },
    ...!skipIcon && {
      ui: {
        icon: 'simple-icons:cloudflarepages',
        color: 'F38020', // cloudflare brand
      },
    },
  };
}

export const CloudflarePagesEnvSchema = createVendorSchema({
  CF_PAGES: {
    extends: DmnoBaseTypes.boolean(),
    typeDescription: 'Flag to detect the build is running on Cloudflare Pages rather than locally',
    ...getCommonPagesTypeInfo(),
  },
  CF_PAGES_BRANCH: {
    extends: GitDataTypes.BranchName,
    description: 'unique ID for the Cloudflare Pages commit',
    ...getCommonPagesTypeInfo(),
  },
  CF_PAGES_COMMIT_SHA: {
    extends: GitDataTypes.CommitSha,
    description: 'sha hash of the current Cloudflare Pages commit',
    ...getCommonPagesTypeInfo(),
  },
  CF_PAGES_URL: {
    extends: 'url',
    description: 'URL of the current Cloudflare Pages site',
    ...getCommonPagesTypeInfo(),
  },
}, { fromVendor: 'cloudflare-pages' });

function getCommonWranglerTypeInfo(skipIcon = false) {
  return {
    externalDocs: {
      url: 'https://developers.cloudflare.com/workers/wrangler/system-environment-variables/',
      description: 'Cloudflare Wrangler env var docs',
    },
    ...!skipIcon && {
      ui: {
        icon: 'simple-icons:cloudflare',
        color: 'F38020', // cloudflare brand
      },
    },
  };
}

export const CloudflareWranglerDataTypes = {
  AccountId: createDmnoDataType({
    extends: DmnoBaseTypes.string(),
    typeLabel: 'cloudflare-wrangler/account-id',
    typeDescription: 'The account ID for the Workers related account.',
    includeInDmnoConfig: false,
    ...getCommonWranglerTypeInfo(),
  }),
  ApiToken: createDmnoDataType({
    extends: DmnoBaseTypes.string(),
    typeLabel: 'cloudflare-wrangler/api-token',
    typeDescription: 'The API token for your Cloudflare account, can be used for authentication for situations like CI/CD, and other automation.',
    sensitive: true,
    includeInDmnoConfig: false,
    ...getCommonWranglerTypeInfo(),
  }),
  ApiKey: createDmnoDataType({
    extends: DmnoBaseTypes.string(),
    typeLabel: 'cloudflare-wrangler/api-key',
    typeDescription: 'The API key for your Cloudflare account, usually used for older authentication method with `CLOUDFLARE_EMAIL`.',
    sensitive: true,
    includeInDmnoConfig: false,
    ...getCommonWranglerTypeInfo(),
  }),
  HyperDriveLocalConnectionString: createDmnoDataType({
    extends: DmnoBaseTypes.string(),
    typeLabel: 'cloudflare-wrangler/hyperdrive-local-connection-string',
    typeDescription: 'The local connection string for your database to use in local development with Hyperdrive. For example, if the binding for your Hyperdrive is named PROD_DB, this would be WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_PROD_DB="postgres://user:password@127.0.0.1:5432/testdb". Each Hyperdrive is uniquely distinguished by the binding name.',
    exampleValue: 'postgres://user:password@127.0.0.1:5432/testdb',
    sensitive: true,
    includeInDmnoConfig: false,
    ...getCommonWranglerTypeInfo(),
  }),
};

export const CloudflareWranglerEnvSchema = createVendorSchema({
  CLOUDFLARE_ACCOUNT_ID: CloudflareWranglerDataTypes.AccountId,
  CLOUDFLARE_API_TOKEN: CloudflareWranglerDataTypes.ApiToken,
  CLOUDFLARE_API_KEY: CloudflareWranglerDataTypes.ApiKey,
  CLOUDFLARE_EMAIL: {
    extends: DmnoBaseTypes.email(),
    description: 'The email address associated with your Cloudflare account, usually used for older authentication method with `CLOUDFLARE_API_KEY`.',
    ...getCommonWranglerTypeInfo(),
  },
  CLOUDFLARE_SEND_METRICS: {
    // CF says this is a string, but it's actually a boolean
    extends: DmnoBaseTypes.boolean(),
    description: 'Whether to send anonymous usage metrics to Cloudflare.',
    ...getCommonWranglerTypeInfo(),
  },
  CLOUDFLARE_API_BASE_URL: {
    extends: DmnoBaseTypes.url(),
    description: 'The base URL for the Cloudflare API.',
    exampleValue: 'https://api.cloudflare.com/client/v4',
    ...getCommonWranglerTypeInfo(),
  },
  WRANGLER_LOG: {
    // TODO: this could be a non-cloudflare specific reusable type?
    extends: DmnoBaseTypes.enum(['none', 'error', 'warn', 'info', 'log', 'debug']),
    coerce: (val) => val.toString().toLowerCase(),
    typeDescription: 'controls what level of logs should be shown',
    description: 'If an invalid level is specified, Wrangler will fallback to the default (log)',
    ...getCommonWranglerTypeInfo(),
  },
  FORCE_COLOR: {
    // TODO: need boolean number type
    extends: DmnoBaseTypes.enum([0, 1]),
    description: 'By setting this to 0, you can disable Wrangler\'s colorised output, which makes it easier to read with some terminal setups',
    ...getCommonWranglerTypeInfo(),
  },
}, { fromVendor: 'cloudflare-wrangler' });


/**
 * These settings are related to `dwrangler`, the DMNO wrangler wrapper
 */
export const DmnoWranglerEnvSchema = createVendorSchema({
  WRANGLER_ENV: {
    description: 'sets value of wrangler --env flag',
    // can do something special here, where dwrangler will populate it for us
  },
  WRANGLER_DEV_IP: {
    description: 'IP/host for wrangler dev to listen on (defaults to localhost)',
    extends: 'string', // TODO: add a proper host type
    value: 'localhost',
  },
  WRANGLER_DEV_PORT: {
    description: 'Port for wrangler dev to listen on (defaults to 8787)',
    extends: DmnoBaseTypes.port(),
    value: 8787,
  },
  WRANGLER_DEV_PROTOCOL: {
    description: 'Protocol to listen to requests on (defaults to http)',
    extends: DmnoBaseTypes.enum(['http', 'https']),
    value: 'http',
  },
  WRANGLER_DEV_URL: {
    description: 'Full url of local wrangler dev server',
    extends: 'url',
    // TODO: this would be a good one to mark as NOT overrideable? (flag does not exist yet)
    // override: false,
    value: (ctx) => {
      return [
        ctx.get('WRANGLER_DEV_PROTOCOL', { allowMissing: true }) || 'http',
        '://',
        ctx.get('WRANGLER_DEV_IP', { allowMissing: true }) || 'localhost',
        ':',
        ctx.get('WRANGLER_DEV_PORT', { allowMissing: true }) || 8787,
      ].join('');
    },
  },
  WRANGLER_LIVE_RELOAD: {
    extends: DmnoBaseTypes.boolean,
    description: 'enable wrangler live-reload without needing to pass in a --live-reload flag',
  },

  WRANGLER_INJECT_MODE: {
    extends: DmnoBaseTypes.enum({
      inline: { description: 'inlines entire resolved config into built files' },
      secrets: { description: 'sets config as secrets on Cloudflare' },
    }),
    value: 'inline',
    description: 'Controls how _dynamic_ config values are injected into your cloudflare workers',
    externalDocs: {
      description: 'DMNO docs - Wrangler platform plugin',
      url: 'https://dmno.dev/docs/platforms/cloudflare/', // TODO: add link to specific section?
    },
    includeInDmnoConfig: false,
  },
  WRANGLER_DEV_ACTIVE: {
    extends: DmnoBaseTypes.boolean,
    description: 'Flag to detect if wrangler is running in dev mode or not',
    externalDocs: {
      description: 'DMNO docs - Wrangler platform plugin',
      url: 'https://dmno.dev/docs/platforms/cloudflare/', // TODO: add link to specific section?
    },
  },
  WRANGLER_BUILD_ACTIVE: {
    extends: DmnoBaseTypes.boolean,
    description: 'Flag to detect if wrangler is performing a build',
    externalDocs: {
      description: 'DMNO docs - Wrangler platform plugin',
      url: 'https://dmno.dev/docs/platforms/cloudflare/', // TODO: add link to specific section?
    },
  },

});
