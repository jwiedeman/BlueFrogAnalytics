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

  // Placeholders for other tools
  const placeholders = [
    'image-bloat',
    'image-convert',
    'tag-drag-race',
    'serp-preview',
    'contrast-heatmap'
  ];
  placeholders.forEach(name => {
    router.all(`/${name}`, (req, res) => {
      res.status(501).json({ error: 'Not implemented' });
    });
  });

  return router;
}
