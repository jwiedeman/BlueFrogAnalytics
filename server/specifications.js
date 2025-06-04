import express from 'express';

export function createSpecRouter(client) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const { category } = req.query;
    try {
      let query = 'SELECT category, tool, name, rule, example, description, updated_at FROM domain_discovery.tracking_specs';
      const params = [];
      if (category) {
        query += ' WHERE category=?';
        params.push(category);
      }
      const result = await client.execute(query, params, { prepare: !!params.length });
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  router.post('/', async (req, res) => {
    if (!req.uid) return res.status(401).json({ error: 'Unauthorized' });
    const { category, tool, name, rule = '', example = '', description = '' } =
      req.body || {};
    if (
      typeof category !== 'string' ||
      typeof tool !== 'string' ||
      typeof name !== 'string'
    ) {
      return res.status(400).json({ error: 'Invalid payload' });
    }
    try {
      await client.execute(
        'INSERT INTO domain_discovery.tracking_specs (category, tool, name, rule, example, description, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [category, tool, name, rule, example, description, new Date()],
        { prepare: true }
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  return router;
}

