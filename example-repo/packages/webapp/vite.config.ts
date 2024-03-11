
// TODO: need to fix the linting rules so it knows to allow dev deps here
/* eslint-disable import/no-extraneous-dependencies */


import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// TODO: currently we're using `dmno run` to pass through config to vite
// but we'll want to re-enable a deeper integration that likely looks something like
// the commented code below

// import { loadConfig } from '@dmno/core';
// const dmnoConfig = loadConfig(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // define: dmnoConfig,
});
