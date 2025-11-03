Check out the [docs](https://dmno.dev/docs/integrations/react-router/) for more information on how to use [DMNO](https://dmno.dev) + [React Router](https://reactrouter.com/).

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/react-router-integration [![npm](https://img.shields.io/npm/v/@dmno/react-router-integration)](https://www.npmjs.com/package/@dmno/react-router-integration)

Provides tooling to integrate dmno into your React Router dev/build workflow

### Installation

```bash 
# let dmno init automatically add the integration
npx dmno init
```

```bash
# or do it manually
npm add @dmno/react-router-integration
```

### Example Usage

Import and initialize our react-router integration and add to your `vite.config.ts` file.

```typescript
import { dmnoReactRouterVitePlugin } from "@dmno/react-router-integration";

import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    dmnoReactRouterVitePlugin(), // <- add this
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
});
```


Depending on your setup, you may also need to explicitly include `dmno-env.d.ts` in your `tsconfig.json` file.
