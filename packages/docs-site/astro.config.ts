import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightBlog from 'starlight-blog';
import vue from '@astrojs/vue';
import robotsTxt from 'astro-robots-txt';
import starlightLinksValidator from 'starlight-links-validator';
import partytown from '@astrojs/partytown';
import dmnoAstroIntegration from '@dmno/astro-integration';

import IconsVitePlugin from 'unplugin-icons/vite';


// https://astro.build/config
export default defineConfig({
  site: 'https://dmno.dev',
  vite: {
    plugins: [
      IconsVitePlugin({
        compiler: 'raw',
      }),
    ],
  },
  integrations: [

    dmnoAstroIntegration(),
    starlight({
      title: '.docs/',
      logo: {
        src: '@dmno/ui-lib/brand-assets/domino-logo-full-outline.svg',
      },
      social: {
        github: DMNO_CONFIG.GITHUB_REPO_URL,
        discord: DMNO_CONFIG.DISCORD_JOIN_URL,
      },
      customCss: [
        './src/style/global.css',
      ],
      plugins: [
        starlightBlog({
          title: '.blog/',
          authors: {
            team: {
              name: 'DMNO Team',
            },
          },
          postCount: 5,
          recentPostCount: 10,
        }),
        starlightLinksValidator(),
      ],
      pagination: false,
      expressiveCode: {
        styleOverrides: {
          borderColor: 'var(--brand-pink)',
          codeFontFamily: 'Fira Code',
          codeLineHeight: '1.6',
        },
      },
      components: {
        Header: './src/components/CustomStarlightHeader.astro',
        ThemeProvider: './src/components/CustomStarlightThemeProvider.astro',
      },
      head: [
        {
          tag: 'script',
          attrs: {
            type: 'text/partytown',
            async: true,
            src: `https://www.googletagmanager.com/gtag/js?id=${DMNO_CONFIG.GOOGLE_TAG_MANAGER_ID}`,
          },
        },
        {
          tag: 'script',
          attrs: {
            type: 'text/partytown',
            innerHTML: `window.dataLayer = window.dataLayer || [];
            function gtag() {
              dataLayer.push(arguments);
            }
            gtag("js", new Date());
          
            gtag("config", "${DMNO_CONFIG.GOOGLE_TAG_MANAGER_ID}");`,
          },
        },
      ],
      sidebar: [
        {
          label: 'Get Started',
          items: [
            {
              label: 'What is DMNO?',
              link: '/docs/get-started/what-is-dmno',
            },
            {
              label: 'Quickstart',
              link: '/docs/get-started/quickstart',
            },
            {
              label: 'Concepts',
              link: '/docs/get-started/concepts',
            },
            {
              label: 'Security',
              link: '/docs/get-started/security',
            }],
        }, {
          label: 'Guides',
          items: [
            {
              label: 'Schema',
              link: '/docs/guides/schema',
            },
            {
              label: 'Repo structure',
              link: '/docs/guides/repo',
            },
            {
              label: 'Incremental Adoption',
              link: '/docs/guides/incremental-adoption',
            },
            {
              label: 'Multiple Environments',
              link: '/docs/guides/multi-env',
            },
            {
              label: 'Dynamic vs static config',
              link: '/docs/guides/dynamic-config',
            },
          ],
        }, {
          label: 'Plugins',
          badge: 'New',
          items: [{
            label: 'Overview',
            link: '/docs/guides/plugins/overview',
          },
          {
            label: 'Encrypted Vaults',
            link: '/docs/guides/plugins/encrypted-vault',
          },
          {
            label: '1Password',
            link: '/docs/guides/plugins/1password',
          }],
        }, {
          label: 'Integrations',
          badge: 'New',
          items: [{
            label: 'Overview',
            link: '/docs/guides/frameworks/overview',
          },
          {
            label: 'Astro',
            link: '/docs/guides/frameworks/astro/',
          },
          {
            label: 'Next.js',
            link: '/docs/guides/frameworks/nextjs/',
          }, {
            label: 'Vite',
            link: '/docs/guides/frameworks/vite/',
          }, {
            label: 'Node.js (Express, Koa, etc.)',
            link: '/docs/guides/frameworks/node/',
          },
          // {
          //   label: "Vercel",
          //   link: "/guides/deployment/vercel/"
          // }, {
          //   label: "Netlify",
          //   link: "/guides/deployment/netlify/"
          // }, {
          //   label: "Railway",
          //   link: "/guides/deployment/railway/"
          // }, {
          //   label: "Render",
          //   link: "/guides/deployment/render/"
          // }
          ],
        },
        {
          label: 'Reference',
          items: [
            {
              label: 'Base Types',
              link: '/docs/reference/base-types/',
            }, {
              label: 'Helper Methods',
              link: '/docs/reference/helper-methods/',
            },
            {
              label: 'CLI',
              items: [
                {
                  label: 'Commands',
                  link: '/docs/reference/cli/commands',
                },
                {
                  label: 'init',
                  link: '/docs/reference/cli/init',
                },
                {
                  label: 'load',
                  link: '/docs/reference/cli/load',
                },
                {
                  label: 'dev',
                  link: '/docs/reference/cli/dev',
                },
                {
                  label: 'run',
                  link: '/docs/reference/cli/run',
                },
                {
                  label: 'plugin',
                  link: '/docs/reference/cli/plugin',
                },
                {
                  label: 'clear-cache',
                  link: '/docs/reference/cli/clear-cache',
                },
              ],
            },
          ],
        },
      ],
    }),
    vue({
      // jsx: true,
    }),
    robotsTxt({
      sitemap: false,
      policy: [{
        userAgent: '*',
        // disable all crawling, except homepage (for now)
        allow: '/$',
        disallow: '/',
      }],
    }),
    partytown({
      config: {
        forward: ['dataLayer.push'],
      },
    }),
  ],
});
