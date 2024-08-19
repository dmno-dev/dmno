Check out the [docs](https://dmno.dev/docs/integrations/remix/) for more information on how to use [DMNO](https://dmno.dev) + [Remix](https://remix.run/).

*** THIS IS PREVIEW SOFTWARE AND SUBJECT TO RAPID CHANGE ***

If you have any questions, please reach out to us on [Discord](https://chat.dmno.dev).

----

# @dmno/remix-integration [![npm](https://img.shields.io/npm/v/@dmno/remix-integration)](https://www.npmjs.com/package/@dmno/remix-integration)

Provides tooling to integrate dmno into your Remix dev/build workflow

### How to use

Import and initialize our remix integration and add to your `vite.config.ts` file.
You must add both the vite plugin and the Remix preset.

```typescript
import { dmnoRemixVitePlugin, dmnoRemixPreset } from "@dmno/remix-integration";
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    dmnoRemixVitePlugin(),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
      presets: [dmnoRemixPreset() as any],
    }),
    tsconfigPaths(),
  ],
});
```
