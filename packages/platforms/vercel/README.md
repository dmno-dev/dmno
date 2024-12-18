Check out the [docs](https://dmno.dev/docs/platforms/vercel/) for more information on how to use [DMNO](https://dmno.dev) with [Vercel](https://vercel.com/).

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/vercel-platform [![npm](https://img.shields.io/npm/v/@dmno/vercel-platform)](https://www.npmjs.com/package/@dmno/vercel-platform)

This package provides a set of prebuilt types and environment variables for Vercel.

## Installation

```bash
npm add @dmno/vercel-platform
```

### Example Usage

```typescript
import { defineDmnoService, switchBy, pickFromSchemaObject } from 'dmno';
import { VercelEnvSchema } from '@dmno/vercel-platform';

export default defineDmnoService({
  schema: {
    ...pickFromSchemaObject(VercelEnvSchema, 'VERCEL_ENV', 'VERCEL_GIT_COMMIT_REF'),
    // example of adding more specificity/control over env flag using vercel's env vars
    APP_ENV: {
      value: () => {
        if (DMNO_CONFIG.VERCEL_ENV === 'production') return 'production';
        if (DMNO_CONFIG.VERCEL_ENV === 'preview') {
          if (DMNO_CONFIG.VERCEL_GIT_COMMIT_REF === 'staging') return 'staging';
          else return 'preview';
        }
        return 'development';
      },
    },
  },
});
```
