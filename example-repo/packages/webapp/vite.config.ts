
// TODO: need to fix the linting rules so it knows to allow dev deps here
/* eslint-disable import/no-extraneous-dependencies */

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

import { getResolvedConfigForEnvInjection } from '@dmno/core';

const injectDmnoConfigPlugin = () => ({
  name: 'inject-dmno-config',
  config(config /* , env: { mode: string, command: string } */) {
    const dmnoConfig = getResolvedConfigForEnvInjection(true);
    config.define = {
      ...config.define,
      ...dmnoConfig,
    };
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), injectDmnoConfigPlugin()],
});
