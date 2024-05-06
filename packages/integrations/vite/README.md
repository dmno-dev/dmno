Check out the [docs](https://dmno.dev/docs/guides/frameworks/vite/) for more information on how to use DMNO + Vite.

*** THIS IS PREVIEW SOFTWARE AND SUBJECT TO RAPID CHANGE ***

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/vite-integration

Provides tooling to integrate dmno into your vite dev/build workflow

### How to use

Import and initialize our vite plugin and add to the plugins section in your vite.config.ts file

```typescript
import { dmnoViteIntegration } from '@dmno/vite-integration';

// https://vitejs.dev/config/
export default defineConfig({
  // ... your existing config
  plugins: [
    // ... the rest of your plugins
    vue(),
    dmnoViteIntegration(),
  ],

});
```


