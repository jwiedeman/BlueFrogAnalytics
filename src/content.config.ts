import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

const extendedDocsSchema = docsSchema({
  extend: (schema) =>
    schema.extend({
      template: z.enum(['doc', 'splash', 'page']).default('doc'),
    }),
});

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: extendedDocsSchema }),
};
