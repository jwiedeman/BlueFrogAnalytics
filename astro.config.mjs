// @ts-check
import { defineConfig } from 'astro/config';
// Using MDX for .md/.mdx rendering and Sitemap generation
import fs from 'fs';
import path from 'path';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkMermaid from 'remark-mermaidjs'
import mdx from '@astrojs/mdx';
import remarkGlossaryLinks from './src/plugins/remark-glossary-links.js';
// Removed expressive-code integration to drop starlight deps

const DOCS_DIR = 'src/content/docs';
const isDev = process.env.NODE_ENV === 'development';

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

// Manually Define First-Level Sections (but auto-scan subfolders)
const sidebar = [
  { label: 'Introduction', items: scanDocsFolder(path.join(DOCS_DIR, 'Introduction')), collapsed: false },
  { label: 'Getting Started', items: scanDocsFolder(path.join(DOCS_DIR, 'Getting-Started')), collapsed: false },
  { label: 'Website Platforms', items: scanDocsFolder(path.join(DOCS_DIR, 'Website-Platforms')), collapsed: true },
  { label: 'Analytics Platforms', items: scanDocsFolder(path.join(DOCS_DIR, 'Analytics-Platforms')), collapsed: true },
  { label: 'Ad Platforms', items: scanDocsFolder(path.join(DOCS_DIR, 'Ad-Platforms')), collapsed: true },
  { label: 'Implementation Guides', items: scanDocsFolder(path.join(DOCS_DIR, 'Implementation-Guides')), collapsed: true },

  { label: 'Learning', items: scanDocsFolder(path.join(DOCS_DIR, 'Learning')), collapsed: true },
  { label: 'Compliance & Privacy', items: scanDocsFolder(path.join(DOCS_DIR, 'Compliance')), collapsed: true },
  { label: 'Performance', items: scanDocsFolder(path.join(DOCS_DIR, 'Performance')), collapsed: true },
  { label: 'SEO', items: scanDocsFolder(path.join(DOCS_DIR, 'SEO')), collapsed: true },
  { label: 'Advanced Concepts', items: scanDocsFolder(path.join(DOCS_DIR, 'Advanced-Concepts')), collapsed: true },
  { label: 'Integrations', items: scanDocsFolder(path.join(DOCS_DIR, 'Integrations')), collapsed: true },
  { label: 'Blue Frog Analytics', items: scanDocsFolder(path.join(DOCS_DIR, 'BlueFrogAnalytics')), collapsed: true },
  { label: 'Community & Support', items: scanDocsFolder(path.join(DOCS_DIR, 'Community')), collapsed: true }


];


const googleAnalyticsId = 'G-4N0P7Z1VJ8'
export default defineConfig({
  site: isDev ? 'http://localhost:3000' : 'https://bluefroganalytics.com',
  base: `/`,
  output: 'static',
  buildOptions: {
    site: `https://bluefroganalytics.com/`,
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
    // MDX for .md/.mdx with math
    mdx({
      extension: ['.md', '.mdx'],
      remarkPlugins: [remarkMath, remarkMermaid, remarkGlossaryLinks],
      rehypePlugins: [rehypeKatex],
    }),
    // Sitemap generation
    sitemap(),
  ],

});
