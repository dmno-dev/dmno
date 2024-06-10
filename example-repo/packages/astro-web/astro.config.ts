import dmnoAstroIntegration, { reloadDmnoConfig } from '@dmno/astro-integration';
import { unmaskSecret } from 'dmno';
import { defineConfig } from 'astro/config';
import vue from "@astrojs/vue";
import node from "@astrojs/node";
import mdx from "@astrojs/mdx";


// Example showing how to enable secret redaction right away
// const dmno = dmnoAstroIntegration({ redactSecrets: true });
// await reloadDmnoConfig();

// console.log('\nthe secret on the next line should be redacted');
// console.log('> secret value =', DMNO_CONFIG.SECRET_FOO);

// console.log('\nthe secret on the next line should not');
// console.log('> secret value =', unmaskSecret(DMNO_CONFIG.SECRET_FOO));

// https://astro.build/config
export default defineConfig({
  integrations: [
    dmnoAstroIntegration({ redactSecrets: true }),
    vue(),
    mdx(),
    {
      name: 'custom',
      hooks: {
        'astro:config:setup': async (opts) => {
          // detects leak
          opts.injectScript(
            // 'head-inline', // detects leak via middleware
            // 'before-hydration', // detects leak via vite plugin
            // 'page', // detects leak via vite plugin
            
            'page-ssr', // not leaked...
            `console.log(${JSON.stringify({
              secret: DMNO_CONFIG.SECRET_FOO,
              public: DMNO_CONFIG.PUBLIC_FOO
            })});`
            
          );
        },
      }
    },
  ],
  ...process.env.TEST_ASTRO_SSR && {
    output: "server",
    adapter: node({
      mode: "standalone"
    }),
  },
});

