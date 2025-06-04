import { Client } from 'cassandra-driver';

const client = new Client({
  contactPoints: ['192.168.1.201', '192.168.1.202', '192.168.1.203', '192.168.1.204'],
  localDataCenter: 'datacenter1',
  keyspace: 'domain_discovery'
});

async function saveResult(url, tool, data) {
  const map = {};
  for (const [k, v] of Object.entries(data)) {
    map[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  await client.execute(
    'INSERT INTO domain_discovery.misc_tool_results (domain, url, tool_name, scan_date, data) VALUES (?, ?, ?, ?, ?)',
    [new URL(url).hostname, url, tool, new Date(), map],
    { prepare: true }
  );
}

async function main() {
  if (process.argv.length < 4) {
    console.error('Usage: node index.js <url> <tool> [jsonData]');
    process.exit(1);
  }
  const url = process.argv[2];
  const tool = process.argv[3];
  const data = process.argv[4] ? JSON.parse(process.argv[4]) : {};
  await client.connect();
  await saveResult(url, tool, data);
  await client.shutdown();
}

main();
