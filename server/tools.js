import express from 'express';
import { load } from 'cheerio';

export function createToolsRouter(updateTest, updateDomainRegistry, saveToolResult, saveCarbonAudit) {
  const router = express.Router();

  async function collectSitemaps(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('fetch failed');
    const xml = await resp.text();
    const list = [{ loc: url, xml }];
    const $ = load(xml, { xmlMode: true });
    const locs = $('sitemapindex > sitemap > loc')
      .map((i, el) => $(el).text().trim())
      .get();
    for (const loc of locs) {
      const child = await collectSitemaps(loc);
      list.push(...child);
    }
    return list;
  }

  function combineSitemaps(list) {
    const urls = [];
    for (const { xml } of list) {
      const $ = load(xml, { xmlMode: true });
      $('urlset > url').each((i, el) => {
        urls.push($.xml(el));
      });
    }
    return (
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.join('\n') +
      '\n</urlset>'
    );
  }

  router.get('/robots-txt', async (req, res) => {
    const { url } = req.query;
    try {
      const u = new URL(url);
      const resp = await fetch(`${u.origin}/robots.txt`);
      if (!resp.ok) {
        return res.status(400).json({ error: 'Failed to fetch robots.txt' });
      }
      const text = await resp.text();
      res.type('text/plain').send(text);
    } catch {
      res.status(400).json({ error: 'Invalid URL' });
    }
  });

  router.get('/sitemap-xml', async (req, res) => {
    const { url, mode } = req.query;
    try {
      const u = new URL(url);
      const sitemaps = await collectSitemaps(u.href);
      if (mode === 'combined') {
        const xml = combineSitemaps(sitemaps);
        return res.type('application/xml').send(xml);
      }
      res.json({ sitemaps });
    } catch {
      res.status(400).json({ error: 'Invalid URL' });
    }
  });

  router.get('/security-headers', async (req, res) => {
    const { url } = req.query;
    try {
      const resp = await fetch(url, { method: 'HEAD' });
      const headers = {};
      resp.headers.forEach((v, k) => {
        headers[k] = v;
      });
      res.json({ headers });
    } catch {
      res.status(400).json({ error: 'Invalid URL' });
    }
  });

  router.post('/carbon', async (req, res) => {
    const { url } = req.body;
    if (typeof url !== 'string') {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    try {
      const resp = await fetch(url);
      const buf = await resp.arrayBuffer();
      const bytes = buf.byteLength;
      // very rough estimate: 1 byte ~ 0.0000005 gCO2
      const co2 = bytes * 5e-7;
      const result = { bytes, co2 };
      if (updateTest && req.uid) {
        await updateTest(req.uid, 'carbon', result);
      }
      if (saveCarbonAudit) {
        await saveCarbonAudit(url, bytes, co2);
      }
      if (saveToolResult) {
        await saveToolResult(url, 'carbon', result);
      }
      res.json(result);
    } catch {
      res.status(500).json({ error: 'Fetch failed' });
    }
  });

  router.post('/image-bloat', async (req, res) => {
    const { url } = req.body;
    if (typeof url !== 'string') {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    try {
      const htmlResp = await fetch(url);
      const html = await htmlResp.text();
      const imgTags = Array.from(html.matchAll(/<img[^>]*>/gi));
      const results = [];
      for (const match of imgTags) {
        const tag = match[0];
        const srcMatch = tag.match(/src=["']([^"']+)["']/i);
        if (!srcMatch) continue;
        const src = srcMatch[1];
        let width = Number((tag.match(/width=["'](\d+)["']/i) || [])[1]);
        let height = Number((tag.match(/height=["'](\d+)["']/i) || [])[1]);
        try {
          const resp = await fetch(new URL(src, url));
          const buf = Buffer.from(await resp.arrayBuffer());
          if (!width || !height) {
            try {
              const sharp = (await import('sharp')).default;
              const meta = await sharp(buf).metadata();
              width = width || meta.width;
              height = height || meta.height;
            } catch {}
          }
          const area = width && height ? width * height : 0;
          const bytes = buf.byteLength;
          const bpp = area ? bytes / area : null;
          const heavy = bpp ? bpp > 1 : bytes > 500000;
          results.push({
            src: new URL(src, url).href,
            bytes,
            width,
            height,
            bpp,
            heavy
          });
        } catch {}
      }
      results.sort((a, b) => b.bytes - a.bytes);
      const out = { images: results };
      if (saveToolResult) {
        await saveToolResult(url, 'image_bloat', out);
      }
      res.json(out);
    } catch {
      res.status(500).json({ error: 'Failed to analyze images' });
    }
  });

  router.post('/tag-drag-race', async (req, res) => {
    const { url } = req.body;
    if (typeof url !== 'string') {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    try {
      const htmlResp = await fetch(url);
      const html = await htmlResp.text();
      const scriptSrcs = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)).map(m => m[1]);
      const results = [];
      for (const src of scriptSrcs) {
        const start = Date.now();
        try {
          const resp = await fetch(new URL(src, url));
          const buf = await resp.arrayBuffer();
          const time = Date.now() - start;
          results.push({ src: new URL(src, url).href, bytes: buf.byteLength, ms: time });
        } catch {
          results.push({ src: new URL(src, url).href, error: 'fetch failed' });
        }
      }
      results.sort((a, b) => b.ms - a.ms);
      const out = { scripts: results };
      if (saveToolResult) {
        await saveToolResult(url, 'tag_drag_race', out);
      }
      res.json(out);
    } catch {
      res.status(500).json({ error: 'Failed to analyze scripts' });
    }
  });

  router.get('/serp-preview', async (req, res) => {
    const { url } = req.query;
    try {
      const htmlResp = await fetch(url);
      const html = await htmlResp.text();
      const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
      const title = titleMatch ? titleMatch[1] : '';
      const description = descMatch ? descMatch[1] : '';
      const score = (0.1 + 0.4 * Math.min(title.length, 60) / 60 +
        0.5 * Math.min(description.length, 160) / 160);
      const out = {
        title,
        description,
        predicted_ctr: Number(score.toFixed(3))
      };
      if (updateDomainRegistry) {
        await updateDomainRegistry(url, { title, description });
      }
      if (saveToolResult) {
        await saveToolResult(url, 'serp_preview', out);
      }
      res.json(out);
    } catch {
      res.status(500).json({ error: 'Failed to fetch page' });
    }
  });

  router.post('/image-convert', async (req, res) => {
    const { filename, data } = req.body;
    if (typeof data !== 'string') {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    try {
      const buf = Buffer.from(data.split(',').pop(), 'base64');
      const sharp = (await import('sharp')).default;
      const out = await sharp(buf).toFormat('webp').toBuffer();
      const result = {
        filename: (filename || 'converted').replace(/\.[^.]+$/, '') + '.webp',
        data: out.toString('base64')
      };
      if (updateTest && req.uid) {
        await updateTest(req.uid, 'image_convert', { bytes: out.length });
      }
      res.json(result);
    } catch {
      res.status(500).json({ error: 'Conversion failed' });
    }
  });

  router.post('/contrast-heatmap', async (req, res) => {
    const { url } = req.body;
    if (typeof url !== 'string') {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    try {
      const puppeteer = (await import('puppeteer')).default;
      const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2' });
      const screenshot = await page.screenshot({ fullPage: true });
      await browser.close();
      const result = { image: screenshot.toString('base64') };
      if (updateTest && req.uid) {
        await updateTest(req.uid, 'contrast_heatmap', { screenshot: true });
      }
      if (saveToolResult) {
        await saveToolResult(url, 'contrast_heatmap', { screenshot: true });
      }
      res.json(result);
    } catch {
      res.status(500).json({ error: 'Failed to capture page' });
    }
  });

  return router;
}
