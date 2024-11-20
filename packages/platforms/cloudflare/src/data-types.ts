import { DmnoBaseTypes, createDmnoDataType, createVendorSchema } from 'dmno';
import { GitDataTypes } from 'dmno/vendor-types';

function getCommonPagesTypeInfo(skipIcon = false) {
  return {
    externalDocs: {
      url: 'https://developers.cloudflare.com/pages/configuration/build-configuration/#environment-variables',
      description: 'Cloudflare Pages docs',
    },
    ...!skipIcon && {
      ui: {
        icon: 'simple-icons:cloudflarepages',
        color: 'F38020', // cloudflare brand
      },
    },
  };
}

export const CloudflarePagesDataTypes = {
  Context: createDmnoDataType({
    typeLabel: 'cloudflare-pages/context',
    extends: DmnoBaseTypes.boolean(),
    typeDescription: 'Changing build behaviour when run on Pages versus locally',
    ...getCommonPagesTypeInfo(),
  }),
  CommitSha: createDmnoDataType({
    extends: GitDataTypes.CommitSha,
    typeLabel: 'cloudflare-pages/commit-sha',
    typeDescription: 'unique ID for the Cloudflare Pages commit',
    exampleValue: '5d4aeac2ccabf517d2f219b8',
    ...getCommonPagesTypeInfo(),
  }),

  Branch: createDmnoDataType({
    typeLabel: 'cloudflare-pages/branch',
    typeDescription: 'name of the branch',
    extends: DmnoBaseTypes.string(),
    ...getCommonPagesTypeInfo(),
  }),

  Url: createDmnoDataType({
    typeLabel: 'cloudflare-pages/url',
    typeDescription: 'URL of the Cloudflare Pages site',
    extends: DmnoBaseTypes.url(),
    ...getCommonPagesTypeInfo(),
  }),
};

export const CloudflarePagesEnvSchema = createVendorSchema({
  CF_PAGES: CloudflarePagesDataTypes.Context,
  CF_PAGES_BRANCH: CloudflarePagesDataTypes.Branch,
  CF_PAGES_COMMIT_SHA: CloudflarePagesDataTypes.CommitSha,
  CF_PAGES_URL: CloudflarePagesDataTypes.Url,
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
    ...getCommonWranglerTypeInfo(),
  }),
  ApiToken: createDmnoDataType({
    extends: DmnoBaseTypes.string(),
    typeLabel: 'cloudflare-wrangler/api-token',
    typeDescription: 'The API token for your Cloudflare account, can be used for authentication for situations like CI/CD, and other automation.',
    ...getCommonWranglerTypeInfo(),
  }),
  ApiKey: createDmnoDataType({
    extends: DmnoBaseTypes.string(),
    typeLabel: 'cloudflare-wrangler/api-key',
    typeDescription: 'The API key for your Cloudflare account, usually used for older authentication method with CLOUDFLARE_EMAIL=.',
    ...getCommonWranglerTypeInfo(),
  }),
  Email: createDmnoDataType({
    extends: DmnoBaseTypes.email(),
    typeLabel: 'cloudflare-wrangler/email',
    typeDescription: 'The email address associated with your Cloudflare account, usually used for older authentication method with CLOUDFLARE_API_KEY=.',
    ...getCommonWranglerTypeInfo(),
  }),
  SendMetrics: createDmnoDataType({ // CF says this is a string, but it's actually a boolean
    extends: DmnoBaseTypes.boolean(),
    typeLabel: 'cloudflare-wrangler/send-metrics',
    typeDescription: 'Whether to send anonymous usage metrics to Cloudflare.',
    ...getCommonWranglerTypeInfo(),
  }),
  HyperDriveLocalConnectionString: createDmnoDataType({
    extends: DmnoBaseTypes.string(),
    typeLabel: 'cloudflare-wrangler/hyperdrive-local-connection-string',
    typeDescription: 'The local connection string for your database to use in local development with Hyperdrive. For example, if the binding for your Hyperdrive is named PROD_DB, this would be WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_PROD_DB="postgres://user:password@127.0.0.1:5432/testdb". Each Hyperdrive is uniquely distinguished by the binding name.',
    exampleValue: 'postgres://user:password@127.0.0.1:5432/testdb',
    ...getCommonWranglerTypeInfo(),
  }),
  ApiBaseUrl: createDmnoDataType({
    extends: DmnoBaseTypes.url(),
    typeLabel: 'cloudflare-wrangler/api-base-url',
    typeDescription: 'The base URL for the Cloudflare API.',
    exampleValue: 'https://api.cloudflare.com/client/v4',
    ...getCommonWranglerTypeInfo(),
  }),
  LogLevel: createDmnoDataType({
    extends: DmnoBaseTypes.enum(['none', 'error', 'warn', 'info', 'log', 'debug']),
    typeLabel: 'cloudflare-wrangler/log-level',
    typeDescription: 'Levels are case-insensitive and default to "log". If an invalid level is specified, Wrangler will fallback to the default.',
    ...getCommonWranglerTypeInfo(),
  }),
  ForceColor: createDmnoDataType({
    extends: DmnoBaseTypes.number(),
    typeLabel: 'cloudflare-wrangler/force-color',
    typeDescription: 'By setting this to 0, you can disable Wrangler\'s colorised output, which makes it easier to read with some terminal setups. For example, FORCE_COLOR=0',
    ...getCommonWranglerTypeInfo(),
  }),
};

export const CloudflareWranglerEnvSchema = createVendorSchema({
  CLOUDFLARE_ACCOUNT_ID: CloudflareWranglerDataTypes.AccountId,
  CLOUDFLARE_API_TOKEN: CloudflareWranglerDataTypes.ApiToken,
  CLOUDFLARE_API_KEY: CloudflareWranglerDataTypes.ApiKey,
  CLOUDFLARE_EMAIL: CloudflareWranglerDataTypes.Email,
  CLOUDFLARE_SEND_METRICS: CloudflareWranglerDataTypes.SendMetrics,
  CLOUDFLARE_API_BASE_URL: CloudflareWranglerDataTypes.ApiBaseUrl,
  WRANGLER_LOG: CloudflareWranglerDataTypes.LogLevel,
  FORCE_COLOR: CloudflareWranglerDataTypes.ForceColor,
}, { fromVendor: 'cloudflare-wrangler' });
