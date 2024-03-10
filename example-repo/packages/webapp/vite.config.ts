
// TODO: need to fix the linting rules so it knows to allow dev deps here
/* eslint-disable import/no-extraneous-dependencies */


import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// TODO: currently we're using `dmno run` to pass through config to vite
// but we'll want to re-enable a deeper integration that likely looks something like
// the commented code below

import { getResolvedConfigForEnvInjection } from '@dmno/core';

const injectDmnoConfigPlugin = () => ({
  name: 'inject-dmno-config',
  config(config /* , env: { mode: string, command: string } */) {
    const dmnoConfig = getResolvedConfigForEnvInjection();

    console.log(dmnoConfig);

    // TODO: we could check for conflicts between existing config.define and our resolved config?
    config.define = {
      ...config.define,
      ...dmnoConfig,
      'DMNO_CONFIG.VITE_GLOBAL_TEST': '420',
    };
  },
});


// const start = new Date();
// const dmnoConfig = getResolvedConfigForEnvInjection();
// console.log('loading config took', new Date().getTime() - start.getTime());

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), injectDmnoConfigPlugin()],
  // define: dmnoConfig,
});
