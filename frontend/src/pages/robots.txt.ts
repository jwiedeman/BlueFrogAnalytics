import type { APIRoute } from 'astro';
export const prerender = true;
const getRobotsTxt = (sitemapURL: URL) => `
User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
`;
export const GET: APIRoute = ({ site }) => {
  const base = site ?? import.meta.env.SITE ?? 'https://bluefroganalytics.com';
  const sitemapURL = new URL('sitemap-index.xml', base);
  return new Response(getRobotsTxt(sitemapURL));
};
