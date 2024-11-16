import { defineConfig } from 'vite'
import { injectDmnoConfigVitePlugin } from '@dmno/vite-integration';

export default defineConfig({
  plugins: [
    injectDmnoConfigVitePlugin({ injectSensitiveConfig: true })
  ],
  build: {
    emptyOutDir: false,
    ssr: "./src/main.ts",
    outDir: "dist",
  },
})
