
// TODO: need to fix the linting rules so it knows to allow dev deps here
/* eslint-disable import/no-extraneous-dependencies */

import { Plugin, PluginOption, defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { injectDmnoConfigVitePlugin } from '@dmno/vite-integration';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // some issues with TS here, I believe it's caused by the local symlink used in our package.json :(
    injectDmnoConfigVitePlugin() as any as Plugin,
  ],
});
