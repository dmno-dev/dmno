import { defineConfig } from 'astro/config';
import dmnoAstroIntegration from '@dmno/astro-integration';
import vue from "@astrojs/vue";
import mdx from "@astrojs/mdx";

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  integrations: [
    dmnoAstroIntegration(),
    vue(),
    mdx(),
    // {
    //   name: 'custom',
    //   hooks: {
    //     'astro:config:setup': async (opts) => {
    //       // detects leak
    //       opts.injectScript(
    //         // 'head-inline', // detects leak via middleware
    //         // 'before-hydration', // detects leak via vite plugin
    //         // 'page', // detects leak via vite plugin
            
    //         'page-ssr', // not leaked...
    //         `console.log(${JSON.stringify(DMNO_CONFIG.SECRET_FOO)});`
    //       );
    //     },
    //   }
    // },
  ],
  ...process.env.TEST_ASTRO_SSR && {
    output: "server",
    adapter: node({
      mode: "standalone"
    }),
  },
});
