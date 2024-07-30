import { dmnoRemixVitePlugin, dmnoRemixPreset } from "@dmno/remix-integration";
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// console.log('> secret value =', DMNO_CONFIG.SECRET_STATIC);

console.log('loaded vite.config.ts');

export default defineConfig({
  plugins: [
    dmnoRemixVitePlugin(),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
      presets: [dmnoRemixPreset()],
    }),
    tsconfigPaths(),
  ],
});
