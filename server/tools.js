import express from 'express';

export function createToolsRouter(updateTest) {
  const router = express.Router();

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
    const { url } = req.query;
    try {
      const u = new URL(url);
      const resp = await fetch(`${u.origin}/sitemap.xml`);
      if (!resp.ok) {
        return res.status(400).json({ error: 'Failed to fetch sitemap.xml' });
      }
      const text = await resp.text();
      res.type('application/xml').send(text);
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
      const imgSrcs = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)).map(m => m[1]);
      const results = [];
      for (const src of imgSrcs) {
        try {
          const resp = await fetch(new URL(src, url));
          const buf = await resp.arrayBuffer();
          results.push({ src: new URL(src, url).href, bytes: buf.byteLength });
        } catch {}
      }
      results.sort((a, b) => b.bytes - a.bytes);
      res.json({ images: results });
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
      res.json({ scripts: results });
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
      res.json({
        title: titleMatch ? titleMatch[1] : '',
        description: descMatch ? descMatch[1] : ''
      });
    } catch {
      res.status(500).json({ error: 'Failed to fetch page' });
    }
  });

  // Basic placeholders for complex tools
  ['image-convert', 'contrast-heatmap'].forEach(name => {
    router.all(`/${name}`, (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });
  });

  return router;
}
