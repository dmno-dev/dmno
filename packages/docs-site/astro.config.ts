import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightBlog from 'starlight-blog';
import vue from '@astrojs/vue';
import robotsTxt from 'astro-robots-txt';
import starlightLinksValidator from 'starlight-links-validator';
import partytown from '@astrojs/partytown';
import IconsVitePlugin from 'unplugin-icons/vite';
import sitemap from '@astrojs/sitemap';
import dmnoAstroIntegration from '@dmno/astro-integration';

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
  trailingSlash: 'always',
  integrations: [
    dmnoAstroIntegration(),
    starlight({
      title: 'DMNO',
      logo: {
        src: '@dmno/ui-lib/brand-assets/domino-logo-full-outline.svg',
      },
      social: {
        github: DMNO_CONFIG.GITHUB_REPO_URL,
        discord: DMNO_CONFIG.DISCORD_JOIN_URL,
      },
      customCss: [
        './src/style/global.less',
      ],
      editLink: {
        baseUrl: 'https://github.com/dmno-dev/dmno/edit/main/packages/docs-site/',
      },
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
      expressiveCode: {
      },
      components: {
        Header: './src/components/CustomStarlightHeader.astro',
        Footer: './src/components/CustomStarlightFooter.astro',
        ThemeProvider: './src/components/CustomStarlightThemeProvider.astro',
        MobileMenuFooter: './src/components/CustomStarlightMobileMenuFooter.astro',
        Banner: './src/components/CustomStarlightBanner.astro',
      },
      head: [
        {
          tag: 'meta',
          attrs: {
            property: 'og:image',
            content: 'https://dmno.dev/og-image.png',
          },
        },
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
        {
          tag: 'script',
          content: `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
          if (window.location.host.includes('dmno.dev')) posthog.init('${DMNO_CONFIG.POSTHOG_API_KEY}',{api_host:'https://us.i.posthog.com'});`,
        },
        {
          tag: 'link',
          attrs: {
            rel: 'sitemap',
            href: '/sitemap-index.xml',
          },
        },
      ],
      sidebar: [
        {
          label: 'Get Started',
          items: [
            {
              label: 'What is DMNO?',
              link: '/docs/get-started/what-is-dmno/',
            },
            {
              label: 'Quickstart',
              link: '/docs/get-started/quickstart/',
            },
            {
              label: 'Concepts',
              link: '/docs/get-started/concepts/',
            },
            {
              label: 'Security',
              link: '/docs/get-started/security/',
            }],
        }, {
          label: 'Guides',
          items: [
            {
              label: 'Schema Authoring',
              link: '/docs/guides/schema/',
            },
            {
              label: 'Incremental Adoption',
              link: '/docs/guides/incremental-adoption/',
            },
            {
              label: 'Multiple Environments',
              link: '/docs/guides/multi-env/',
            },
            {
              label: 'Dynamic vs Static Config',
              link: '/docs/guides/dynamic-config/',
            },
            {
              label: 'TypeScript',
              link: '/docs/guides/typescript/',
            },
          ],
        }, {
          label: 'Plugins',
          badge: 'New',
          items: [{
            label: 'Overview',
            link: '/docs/plugins/overview/',
          },
          {
            label: 'Encrypted Vaults',
            link: '/docs/plugins/encrypted-vault/',
          },
          {
            label: '1Password',
            link: '/docs/plugins/1password/',
          }],
        }, {
          label: 'Integrations',
          badge: 'New',
          items: [{
            label: 'Overview',
            link: '/docs/integrations/overview/',
          },
          {
            label: 'Astro',
            link: '/docs/integrations/astro/',
          },
          {
            label: 'Next.js',
            link: '/docs/integrations/nextjs/',
          }, {
            label: 'Vite',
            link: '/docs/integrations/vite/',
          }, {
            label: 'Node.js',
            link: '/docs/integrations/node/',
          },
          // {
          //   label: "Vercel",
          //   link: "/docs/deployment/vercel/"
          // }, {
          //   label: "Netlify",
          //   link: "/docs/deployment/netlify/"
          // }, {
          //   label: "Railway",
          //   link: "/docs/deployment/railway/"
          // }, {
          //   label: "Render",
          //   link: "/docs/deployment/render/"
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
                  link: '/docs/reference/cli/commands/',
                },
                {
                  label: 'init',
                  link: '/docs/reference/cli/init/',
                },
                {
                  label: 'load',
                  link: '/docs/reference/cli/load/',
                },
                {
                  label: 'dev',
                  link: '/docs/reference/cli/dev/',
                },
                {
                  label: 'run',
                  link: '/docs/reference/cli/run/',
                },
                {
                  label: 'plugin',
                  link: '/docs/reference/cli/plugin/',
                },
                {
                  label: 'clear-cache',
                  link: '/docs/reference/cli/clear-cache/',
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
      policy: [
        {
          userAgent: '*',
          // The next line enables or disables the crawling on the `robots.txt` level
          disallow: DMNO_CONFIG.DMNO_ENV !== 'production' ? '/' : '',
        },
      ],
    }),
    partytown({
      config: {
        forward: ['dataLayer.push'],
      },
    }),
    sitemap({
      filter(page) {
        return !(
          page.includes('/deployment/')
          || page.includes('/nuxtjs')
          || page.includes('/blog')
        );
      },
    }),
  ],
});
