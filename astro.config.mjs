// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// Set your repository name (GitHub Pages serves from `/your-repo/` subpath)
const repoName = 'jwiedeman.github.io'; // <-- Replace with your actual repo name

export default defineConfig({
  site: `https://jwiedeman.github.io/`, // Set site URL
  base: `/`, // Important for GitHub Pages routing
  output: 'static', // Ensure Astro outputs static files
  integrations: [
    starlight({
      title: 'ViperScan',
      social: {
        github: 'https://github.com/jwiedeman',
      },
      sidebar: [
        {
          label: 'Main Navigation',
          items: [
            { label: 'Home', link: '/' },
            { label: 'My Custom Page', link: '/test/' },
          ],
        },
        {
          label: 'Guides',
          items: [{ label: 'Example Guide', slug: 'guides/example' }],
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
      ],
	  components: {
        Header: './src/components/CustomHeader.astro'
      },
    }),
  ],
});
