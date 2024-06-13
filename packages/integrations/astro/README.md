Check out the [docs](https://dmno.dev/docs/guides/frameworks/astro/) for more information on how to use DMNO + Astro.

*** THIS IS PREVIEW SOFTWARE AND SUBJECT TO RAPID CHANGE ***

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/astro-integration

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



