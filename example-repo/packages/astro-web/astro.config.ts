import dmnoAstroIntegration from '@dmno/astro-integration';
import { unredact } from 'dmno';
import { defineConfig } from 'astro/config';
import vue from "@astrojs/vue";
import node from "@astrojs/node";
import mdx from "@astrojs/mdx";

// dmno config is already injected by including the astro integration
// this includes the DMNO_CONFIG globals, and global patching behavior
// like secret redaction and http interception

console.log('\njust doing some console.log debugging...');
console.log('> secret value =', DMNO_CONFIG.SECRET_FOO);
console.log('> secret value in obj', { secret: DMNO_CONFIG.SECRET_FOO });
console.log('> secret value in array', ['secret', DMNO_CONFIG.SECRET_FOO ]);

// console.log('\nthe secret on the next line should not');
// console.log('> secret value =', unredact(DMNO_CONFIG.SECRET_FOO));

// https://astro.build/config
export default defineConfig({
  integrations: [
    dmnoAstroIntegration() as any,
    vue({ appEntrypoint: '/src/vue-app-config' }),
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

