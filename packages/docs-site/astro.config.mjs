import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
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
      sidebar: [
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
