// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import fs from 'fs';
import path from 'path';

const DOCS_DIR = 'src/content/docs';

/**
 * Recursively scans the docs folder and generates a sidebar with lowercase URLs.
 * - Keeps labels human-readable.
 * - Converts paths to lowercase for URLs.
 */
const scanDocsFolder = (dir, basePath = '') => {
  const items = [];

  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    const relativePath = path.relative(DOCS_DIR, fullPath).replace(/\\/g, '/');

    if (fs.statSync(fullPath).isDirectory()) {
      const folderName = file.replace(/ /g, '-');

      const subItems = scanDocsFolder(fullPath, folderName);
      if (subItems.length > 0) {
        items.push({
          label: file.replace(/-/g, ' '), // Keep human-readable label
          items: subItems,
          collapsed: true, // Default collapsed state
        });
      }
    } else if (file.endsWith('.md')) { 
      const cleanPath = relativePath.replace(/\.md$/, '').toLowerCase(); // Lowercase URL path

      items.push({
        label: file.replace('.md', '').replace(/-/g, ' '), // Keep human-readable title
        link: `/${cleanPath}`, // Ensure lowercase URL consistency
      });
    }
  });

  return items;
};

// 🔹 Manually Define First-Level Sections (but auto-scan subfolders)
const sidebar = [
  { label: 'Introduction', items: scanDocsFolder(path.join(DOCS_DIR, 'Introduction')), collapsed: false },
  { label: 'Getting Started', items: scanDocsFolder(path.join(DOCS_DIR, 'Getting-Started')), collapsed: false },
  { label: 'Website Platforms', items: scanDocsFolder(path.join(DOCS_DIR, 'Website-Platforms')), collapsed: true },
  { label: 'Analytics Platforms', items: scanDocsFolder(path.join(DOCS_DIR, 'Analytics-Platforms')), collapsed: true },
  { label: 'Implementation Guides', items: scanDocsFolder(path.join(DOCS_DIR, 'Implementation-Guides')), collapsed: true },
  { label: 'Web Tracking Fundamentals', items: scanDocsFolder(path.join(DOCS_DIR, 'Web-Tracking-Fundamentals')), collapsed: true },
  { label: 'Compliance & Privacy', items: scanDocsFolder(path.join(DOCS_DIR, 'Compliance & Privacy')), collapsed: true },
  { label: 'Performance & SEO', items: scanDocsFolder(path.join(DOCS_DIR, 'Performance & SEO')), collapsed: true },
  { label: 'Advanced Concepts', items: scanDocsFolder(path.join(DOCS_DIR, 'Advanced-Concepts')), collapsed: true },
  { label: 'Debugging & Troubleshooting', items: scanDocsFolder(path.join(DOCS_DIR, 'Debugging & Troubleshooting')), collapsed: true },
  { label: 'Integrations', items: scanDocsFolder(path.join(DOCS_DIR, 'Integrations')), collapsed: true },
  { label: 'API Reference', items: scanDocsFolder(path.join(DOCS_DIR, 'API-Reference')), collapsed: true },
  { label: 'Case Studies & Use Cases', items: scanDocsFolder(path.join(DOCS_DIR, 'Case Studies & Use Cases')), collapsed: true },
  { label: 'Community & Support', items: scanDocsFolder(path.join(DOCS_DIR, 'Community & Support')), collapsed: true },
  { label: 'Roadmap', items: scanDocsFolder(path.join(DOCS_DIR, 'Roadmap')), collapsed: true },
];

export default defineConfig({
  site: `https://jwiedeman.github.io/`,
  base: `/`,
  output: 'static',
  buildOptions: {
    site: `https://jwiedeman.github.io/`,
    trailingSlash: false,
  },
  vite: {
    plugins: [
      {
        name: 'force-lowercase-urls',
        enforce: 'post',
        transformIndexHtml(html) {
          return html.replace(/href="([^"]+)"/g, (match, url) => {
            return `href="${url.toLowerCase()}"`;
          });
        },
      },
    ],
  },
  integrations: [
    starlight({
      title: 'ViperScan',
      social: {
        github: 'https://github.com/jwiedeman',
      },
      sidebar,
      components: {
        Header: './src/components/CustomHeader.astro',
      },
    }),
  ],
});
