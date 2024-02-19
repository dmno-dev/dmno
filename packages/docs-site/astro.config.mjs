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
            }
          ]
        },
        {
          label: "Guides",
          items: [
            // Each item here is one entry in the navigation menu.
            {
              label: "Example Guide",
              link: "/guides/example/",
            },
          ],
        },
        {
          label: "Reference",
          autogenerate: {
            directory: "reference",
          },
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
      policy: [
        {
          userAgent: '*',
          // disable all crawling (for now)
          disallow: '',
        },
      ]
    }),
  ],
});
