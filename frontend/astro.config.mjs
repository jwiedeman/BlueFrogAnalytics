// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'url';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
  integrations: [react(), mdx()],
});
