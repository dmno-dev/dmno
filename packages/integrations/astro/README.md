Check out the [docs](https://dmno.dev/docs/integrations/astro/) for more information on how to use [DMNO](https://dmno.dev) + [Astro](https://astro.build/).


If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/astro-integration [![npm](https://img.shields.io/npm/v/@dmno/astro-integration)](https://www.npmjs.com/package/@dmno/astro-integration)

Provides tooling to integrate dmno into your astro dev/build workflow

### Installation

```bash
# let dmno init do the work for you
npx dmno init
```

```bash
# or do it manually
npm add @dmno/astro-integration
```

### Example Usage

Import and initialize our astro integration and add to the integrations section in your astro.config.mjs file

```typescript
import { defineConfig } from 'astro/config';
import dmnoAstroIntegration from '@dmno/astro-integration';

// https://astro.build/config
export default defineConfig({
  integrations: [
    dmnoAstroIntegration(),
  ]
});
```



