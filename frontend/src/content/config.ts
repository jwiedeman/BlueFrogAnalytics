import { z, defineCollection } from 'astro:content';

export const collections = {
  blog: defineCollection({
    type: 'content',
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      pubDate: z.date().optional(),
      originalPubDate: z.date().optional(),
      updatedDate: z.date().optional(),
      author: z.string().optional(),
      tags: z.array(z.string()).default([]),
      published: z.boolean().default(true),
    }),
  }),
  docs: defineCollection({ type: 'content' }),
};
