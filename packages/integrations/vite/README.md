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
