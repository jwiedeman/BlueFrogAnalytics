// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import fs from 'fs';
import path from 'path';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkMermaid from 'remark-mermaidjs'
import mdx from '@astrojs/mdx';
import astroExpressiveCode from 'astro-expressive-code';

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

// 🔹 Manually Define First-Level Sections (but auto-scan subfolders)
const sidebar = [
  { label: 'Introduction', items: scanDocsFolder(path.join(DOCS_DIR, 'Introduction')), collapsed: false },
  { label: 'Getting Started', items: scanDocsFolder(path.join(DOCS_DIR, 'Getting-Started')), collapsed: false },
  { label: 'Website Platforms', items: scanDocsFolder(path.join(DOCS_DIR, 'Website-Platforms')), collapsed: true },
  { label: 'Analytics Platforms', items: scanDocsFolder(path.join(DOCS_DIR, 'Analytics-Platforms')), collapsed: true },
  { label: 'Ad Platforms', items: scanDocsFolder(path.join(DOCS_DIR, 'Ad-Platforms')), collapsed: true },
  { label: 'Implementation Guides', items: scanDocsFolder(path.join(DOCS_DIR, 'Implementation-Guides')), collapsed: true },
  { label: 'Web Tracking Fundamentals', items: scanDocsFolder(path.join(DOCS_DIR, 'Web-Tracking-Fundamentals')), collapsed: true },
  { label: 'Compliance & Privacy', items: scanDocsFolder(path.join(DOCS_DIR, 'Compliance')), collapsed: true },
  { label: 'Performance', items: scanDocsFolder(path.join(DOCS_DIR, 'Performance')), collapsed: true },
  { label: 'SEO', items: scanDocsFolder(path.join(DOCS_DIR, 'SEO')), collapsed: true },
  { label: 'Advanced Concepts', items: scanDocsFolder(path.join(DOCS_DIR, 'Advanced-Concepts')), collapsed: true },
  { label: 'Debugging & Troubleshooting', items: scanDocsFolder(path.join(DOCS_DIR, 'Debugging')), collapsed: true },
  { label: 'Integrations', items: scanDocsFolder(path.join(DOCS_DIR, 'Integrations')), collapsed: true },
  { label: 'API Reference', items: scanDocsFolder(path.join(DOCS_DIR, 'API-Reference')), collapsed: true },
  { label: 'Case Studies & Use Cases', items: scanDocsFolder(path.join(DOCS_DIR, 'CaseStudies')), collapsed: true },
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

  integrations: [astroExpressiveCode(), mdx(), starlight({

    title: 'Blue Frog Analytics',
    social: {
      github: 'https://github.com/jwiedeman',
    },
    sidebar,
    components: {
      Header: './src/components/CustomHeader.astro',
      Footer: './src/components/CustomFooter.astro',
    },
	  head: [
      // Adding google analytics
      {
        tag: 'script',
        attrs: {
          src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`,
        },
      },
      {
        tag: 'script',
        content: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', '${googleAnalyticsId}');
        `,
      },
      {
        tag: 'script',
        content: `
          if (!localStorage.getItem('starlight-theme')) {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('starlight-theme', 'light');
          }
        `,
      },
      {
        tag: 'script',
        content: `
          document.addEventListener('DOMContentLoaded', () => {
            function openHashDetails() {
              const id = location.hash.slice(1);
              if (!id) return;
              const el = document.getElementById(id) ||
                          document.getElementById(id.replace(/-/g, '_')) ||
                          document.getElementById(id.replace(/_/g, '-'));
              if (el && el.tagName.toLowerCase() === 'details') {
                el.open = true;
              }
            }
            openHashDetails();
            window.addEventListener('hashchange', openHashDetails);
          });
        `,
      },

    ],
  }), sitemap()],

  markdown: {
        remarkPlugins: [remarkMath,remarkMermaid],
        rehypePlugins: [rehypeKatex]
    }
});
