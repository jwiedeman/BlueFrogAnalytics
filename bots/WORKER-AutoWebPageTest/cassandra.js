const { Client } = require('cassandra-driver');

let client;

module.exports = {
  async init(config = {}) {
    const contactPoints = (process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1').split(',');
    const localDataCenter = process.env.CASSANDRA_LOCAL_DATA_CENTER || 'datacenter1';
    const keyspace = process.env.CASSANDRA_KEYSPACE || 'domain_discovery';

    client = new Client({ contactPoints, localDataCenter, keyspace, ...config });
    await client.connect();
    await client.execute(`
      CREATE TABLE IF NOT EXISTS webpagetest_results (
        url text PRIMARY KEY,
        json text
      )
    `);
  },

  async send(data) {
    if (!client) throw new Error('Cassandra client not initialized');
    await client.execute(
      'INSERT INTO webpagetest_results (url, json) VALUES (?, ?)',
      [data.url, JSON.stringify(data.json)],
      { prepare: true }
    );
  }
};
