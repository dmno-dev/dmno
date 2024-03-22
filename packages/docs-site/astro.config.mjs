import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightBlog from 'starlight-blog'
import vue from "@astrojs/vue";
import robotsTxt from "astro-robots-txt";


// https://astro.build/config
export default defineConfig({
  site: 'https://dmno.dev',
  integrations: [
    starlight({
      title: "DMNO Docs",
      logo: {
        src: "./src/assets/square-logo.svg",
      },
      social: {
        github: "https://github.com/dmno-dev",
      },
      plugins: [starlightBlog()],
      pagination: false,
      sidebar: [
        {
          label: "Get Started",
          items: [
            {
              label: "Quickstart",
              link: "/get-started/quickstart"
            },
            {
              label: "Concepts",
              link: "/get-started/concepts"
            },
            {
              label: "Schema",
              link: "/get-started/schema"
            },
            {
              label: "Secrets",
              link: "/get-started/secrets"
            },
          ]
        },
        {
          label: "Guides",
          items: [
            {
              label: "Frameworks",
              items: [
                {
                  label: "Next.js",
                  link: "/guides/frameworks/nextjs/",
                },
                {
                  label: "Nuxt.js",
                  link: "/guides/frameworks/nuxtjs/",
                },
                {
                  label: "Astro",
                  link: "/guides/frameworks/astro/",
                },
              ],
            },
            {
              label: "Deployment Platforms",
              items: [
                {
                  label: "Vercel",
                  link: "/guides/deployment/vercel/",
                },
                {
                  label: "Netlify",
                  link: "/guides/deployment/netlify/",
                },
                {
                  label: "Railway",
                  link: "/guides/deployment/railway/",
                },
                {
                  label: "Render",
                  link: "/guides/deployment/render/",
                },
              ],

            }    
          ],
        },
        {
          label: "Reference",
          items: [
            {
              label: 'config-engine',
              items: [
                {
                  label: 'Installation',
                  link: '/reference/config-engine/installation/'
                },
                {
                  label: 'Base Types',
                  link: '/reference/config-engine/base-types/'
                },
                {
                  label: 'Helper Methods',
                  link: '/reference/config-engine/helper-methods/'
                },
              ]
            },
            {
              label: 'dmno-cli',
              items: [
                {
                  label: 'Installation',
                  link: '/reference/dmno-cli/installation/'
                },
                {
                  label: 'Commands',
                  link: '/reference/dmno-cli/commands/'
                },
              ]
            }
          ]
        },
        {
          label: "Plugins",
          autogenerate: {
            directory: "plugins"
          }
        }
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
          // disable all crawling, except homepage (for now)
          allow: '/$',
          disallow: '/',
        },
      ]
    }),
  ],
});
