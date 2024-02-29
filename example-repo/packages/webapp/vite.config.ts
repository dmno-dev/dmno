import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

import { loadConfig } from '@dmno/core';

const dmnoConfig = loadConfig(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  define: dmnoConfig,
});
