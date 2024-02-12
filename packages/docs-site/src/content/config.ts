import { z, defineCollection } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({ schema: docsSchema() }),
  blog: defineCollection({ schema: z.object({
    title: z.string(),
    tags: z.array(z.string()).optional(),
    image: z.string().optional(),
  }),
  })
};
