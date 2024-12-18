Check out the [docs](https://dmno.dev/docs/integrations/nextjs/) for more information on how to use [DMNO](https://dmno.dev) + [Next.js](https://nextjs.org/).

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/nextjs-integration [![npm](https://img.shields.io/npm/v/@dmno/nextjs-integration)](https://www.npmjs.com/package/@dmno/nextjs-integration)

Provides tooling to integrate dmno into your nextjs app

  ### Installation

```bash
# let dmno init do the work for you
npx dmno init
```

```bash
# or do it manually
npm add @dmno/nextjs-integration
```

### Example Usage

Initialize the plugin and use in your next config (`next.config.mjs`)

```typescript
import { dmnoNextConfigPlugin } from '@dmno/nextjs-integration';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // rest of user config...
};

export default dmnoNextConfigPlugin()(nextConfig);
```


#### Add to your site code

Import the module somewhere that will affect all pages - for example in `App.tsx` or `layout.tsx`
```typescript
import '@dmno/nextjs-integration';

//... the rest of your normal code ...
```


#### Add to package.json

```json
{
  "name": "yourapp",
  "scripts": {
    "dev": "dmno run -w -- next dev",
    "build": "dmno run -- next build",
    "start": "dmno run -- next start",
    "lint": "dmno run -- next lint"
  },
  // ...
}
```

