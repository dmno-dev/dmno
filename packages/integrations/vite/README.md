Check out the [docs](https://dmno.dev/docs/integrations/vite/) for more information on how to use [DMNO](https://dmno.dev) + [Vite](https://vitejs.dev/).

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/vite-integration [![npm](https://img.shields.io/npm/v/@dmno/vite-integration)](https://www.npmjs.com/package/@dmno/vite-integration)

Provides tooling to integrate `dmno` into your Vite dev/build workflow

## How to use

### Installation

```bash
# let dmno init do the work for you
npx dmno init
```

```bash
# or do it manually
npm add @dmno/vite-integration
```

### Usage

Import and initialize our Vite plugin and add to the plugins section in your `vite.config.ts` file

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
