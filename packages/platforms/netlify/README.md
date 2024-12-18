Check out the [docs](https://dmno.dev/docs/platforms/netlify/) for more information on how to use [DMNO](https://dmno.dev) with [Netlify](https://netlify.com/).

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/netlify-platform [![npm](https://img.shields.io/npm/v/@dmno/netlify-platform)](https://www.npmjs.com/package/@dmno/netlify-platform)

This package provides a set of prebuilt types and environment variables for Netlify.

## Installation

```bash
npm add @dmno/netlify-platform
```

### Example Usage

```typescript
import { defineDmnoService, switchBy, pickFromSchemaObject } from 'dmno';
import { NetlifyEnvSchema } from '@dmno/netlify-platform/types';

export default defineDmnoService({
  schema: {
    ...pickFromSchemaObject(NetlifyEnvSchema, 'CONTEXT', 'BUILD_ID'),
    APP_ENV: {
      value: switchBy('CONTEXT', {
        _default: 'local',
        'deploy-preview': 'staging',
        'branch-deploy': 'staging',
        production: 'production',
      }),
    },
  },
});
```
