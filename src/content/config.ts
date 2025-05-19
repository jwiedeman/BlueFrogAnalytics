import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// Extend the default Starlight docs schema to allow the `page` template
const extendedDocsSchema = docsSchema()
  .extend({
    template: z.enum(['doc', 'splash', 'page']).default('doc'),
  });

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: extendedDocsSchema }),
};
