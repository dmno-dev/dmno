
// TODO: need to fix the linting rules so it knows to allow dev deps here
/* eslint-disable import/no-extraneous-dependencies */

/// <reference types="./.dmno/.typegen/global.d.ts" />

import { injectDmnoConfigVitePlugin } from '@dmno/vite-integration';
import { Plugin, defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// DMNO_CONFIG is avilable here!
// console.log(DMNO_CONFIG.BOOLEAN_EXAMPLE);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // some issues with TS here, I believe it's caused by the local symlink used in our package.json :(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    injectDmnoConfigVitePlugin() as any as Plugin,
    vue(),
  ],
});
