# @dmno/vite-integration

Provides tooling to integrate dmno into your astro dev/build workflow

### How to use

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


add type references to `src/env.d.ts`

```
/// <reference types="../.dmno/.typegen/global-public.d.ts" />
```
