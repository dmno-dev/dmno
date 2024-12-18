Check out the [docs](https://dmno.dev/docs/platforms/cloudflare/) for more information on how to use [DMNO](https://dmno.dev) with [Cloudflare](https://cloudflare.com/).

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/cloudflare-platform [![npm](https://img.shields.io/npm/v/@dmno/cloudflare-platform)](https://www.npmjs.com/package/@dmno/cloudflare-platform)

### Installation

```bash
npm add @dmno/cloudflare-platform
```

### Example Usage

```typescript
import { CloudflareWranglerEnvSchema, DmnoWranglerEnvSchema } from '@dmno/cloudflare-platform';
import { OnePasswordDmnoPlugin } from '@dmno/1password-plugin';
import {
  DmnoBaseTypes, defineDmnoService, pickFromSchemaObject, switchBy,
} from 'dmno';

// initialize our 1Password plugin
const opSecrets = new OnePasswordDmnoPlugin('1pass', {
  fallbackToCliBasedAuth: true,
});

export default defineDmnoService({
  schema: {
    // config that affects wrangler directly
    ...pickFromSchemaObject(CloudflareWranglerEnvSchema, {
      CLOUDFLARE_ACCOUNT_ID: {
        value: opSecrets.itemByReference('op://Shared/Cloudflare/account id'),
      },
      CLOUDFLARE_API_TOKEN: {
        value: opSecrets.itemByReference('op://Shared/Cloudflare/workers api token'),
      },
    }),

    // special config that controls wrangler via `dwrangler` cli wrapper (all optional)
    ...pickFromSchemaObject(DmnoWranglerEnvSchema, {
      WRANGLER_ENV: {}, // passed as --env
      WRANGLER_DEV_IP: { value: 'custom.host.local' }, // passed as --ip
      WRANGLER_DEV_PORT: { value: 8881 }, // passed as --port
      WRANGLER_DEV_URL: {}, // will be populated with full dev URL
      WRANGLER_LIVE_RELOAD: { value: true }, // passed as `--live-reload`
      WRANGLER_DEV_ACTIVE: {}, // true when running `dwrangler dev` or `dwrangler pages dev`
      WRANGLER_BUILD_ACTIVE: {}, // true when dwrangler is performing a build for deployment
    }),

    // ... rest of your app config
    SOME_VAR: {
      value: switchBy('WRANGLER_DEV_ACTIVE', { // use info from wrangler to affect other config
        _default: 'dev value',
        false: 'prod value',
      }),
    },
  },
});
```

### `dwrangler` wrapper

Our Cloudflare platform integration also provides a thin wrapper called `dwrangler` that injects the config into the `wrangler` cli. In most cases, you can just use `dwrangler` in your package.json scripts instead of `wrangler`.

```json
{
  "scripts": {
    "dev": "dwrangler dev",
    "deploy": "dwrangler deploy"
  }
}
```

> Read more about the `dwrangler` wrapper and all the additional features DMNO unlocks in the [docs](https://dmno.dev/docs/platforms/cloudflare/).
