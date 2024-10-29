// vite.config.ts
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "file:///Users/theo/dmno/dmno-reactivity/node_modules/.pnpm/vite@5.4.6_@types+node@20.14.12_less@4.2.0/node_modules/vite/dist/node/index.js";
import vue from "file:///Users/theo/dmno/dmno-reactivity/node_modules/.pnpm/@vitejs+plugin-vue@5.1.4_vite@5.4.6_@types+node@20.14.12_less@4.2.0__vue@3.5.12_typescript@5.5.4_/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueDevTools from "file:///Users/theo/dmno/dmno-reactivity/node_modules/.pnpm/vite-plugin-vue-devtools@7.5.2_rollup@4.21.3_vite@5.4.6_@types+node@20.14.12_less@4.2.0__vue@3.5.12_typescript@5.5.4_/node_modules/vite-plugin-vue-devtools/dist/vite.mjs";
import svgLoader from "file:///Users/theo/dmno/dmno-reactivity/node_modules/.pnpm/vite-svg-loader@5.1.0_vue@3.5.12_typescript@5.5.4_/node_modules/vite-svg-loader/index.js";
import { injectDmnoConfigVitePlugin } from "file:///Users/theo/dmno/dmno-reactivity/packages/integrations/vite/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///Users/theo/dmno/dmno-reactivity/packages/dev-ui/vite.config.ts";
var vite_config_default = defineConfig({
  server: {
    port: 4666
  },
  plugins: [
    injectDmnoConfigVitePlugin(),
    vue(),
    vueDevTools(),
    svgLoader()
    // self-signed cert just for local dev
    // basicSSL({ name: 'dmno-dev' }),
  ],
  resolve: {
    conditions: ["ts-src"],
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvdGhlby9kbW5vL2Rtbm8tcmVhY3Rpdml0eS9wYWNrYWdlcy9kZXYtdWlcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy90aGVvL2Rtbm8vZG1uby1yZWFjdGl2aXR5L3BhY2thZ2VzL2Rldi11aS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvdGhlby9kbW5vL2Rtbm8tcmVhY3Rpdml0eS9wYWNrYWdlcy9kZXYtdWkvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tICdub2RlOnVybCdcblxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCB2dWUgZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlJ1xuaW1wb3J0IHZ1ZURldlRvb2xzIGZyb20gJ3ZpdGUtcGx1Z2luLXZ1ZS1kZXZ0b29scydcbmltcG9ydCBiYXNpY1NTTCBmcm9tICdAdml0ZWpzL3BsdWdpbi1iYXNpYy1zc2wnXG5pbXBvcnQgc3ZnTG9hZGVyIGZyb20gJ3ZpdGUtc3ZnLWxvYWRlcidcblxuaW1wb3J0IHsgaW5qZWN0RG1ub0NvbmZpZ1ZpdGVQbHVnaW4gfSBmcm9tICdAZG1uby92aXRlLWludGVncmF0aW9uJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDQ2NjYsXG4gIH0sXG4gIHBsdWdpbnM6IFtcbiAgICBpbmplY3REbW5vQ29uZmlnVml0ZVBsdWdpbigpIGFzIGFueSxcbiAgICB2dWUoKSxcbiAgICB2dWVEZXZUb29scygpLFxuICAgIHN2Z0xvYWRlcigpLFxuICAgIC8vIHNlbGYtc2lnbmVkIGNlcnQganVzdCBmb3IgbG9jYWwgZGV2XG4gICAgLy8gYmFzaWNTU0woeyBuYW1lOiAnZG1uby1kZXYnIH0pLFxuICBdLFxuICByZXNvbHZlOiB7XG4gICAgY29uZGl0aW9uczogWyd0cy1zcmMnXSxcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjJywgaW1wb3J0Lm1ldGEudXJsKSlcbiAgICB9XG4gIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFrVSxTQUFTLGVBQWUsV0FBVztBQUVyVyxTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFNBQVM7QUFDaEIsT0FBTyxpQkFBaUI7QUFFeEIsT0FBTyxlQUFlO0FBRXRCLFNBQVMsa0NBQWtDO0FBUjZKLElBQU0sMkNBQTJDO0FBV3pQLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCwyQkFBMkI7QUFBQSxJQUMzQixJQUFJO0FBQUEsSUFDSixZQUFZO0FBQUEsSUFDWixVQUFVO0FBQUE7QUFBQTtBQUFBLEVBR1o7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLFlBQVksQ0FBQyxRQUFRO0FBQUEsSUFDckIsT0FBTztBQUFBLE1BQ0wsS0FBSyxjQUFjLElBQUksSUFBSSxTQUFTLHdDQUFlLENBQUM7QUFBQSxJQUN0RDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
