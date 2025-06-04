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

  return router;
}

