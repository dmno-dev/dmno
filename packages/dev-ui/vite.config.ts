import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import basicSSL from '@vitejs/plugin-basic-ssl'
import svgLoader from 'vite-svg-loader'

import { injectDmnoConfigVitePlugin } from '@dmno/vite-integration';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 4666,
  },
  plugins: [
    injectDmnoConfigVitePlugin() as any,
    vue(),
    vueDevTools(),
    svgLoader(),
    // self-signed cert just for local dev
    // basicSSL({ name: 'dmno-dev' }),
  ],
  resolve: {
    conditions: ['ts-src'],
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
})
