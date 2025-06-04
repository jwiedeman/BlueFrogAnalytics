import { Client } from 'cassandra-driver';

const client = new Client({
  contactPoints: ['192.168.1.201', '192.168.1.202', '192.168.1.203', '192.168.1.204'],
  localDataCenter: 'datacenter1',
  keyspace: 'domain_discovery'
});

async function auditUrl(url) {
  try {
    const resp = await fetch(url);
    const buf = await resp.arrayBuffer();
    const bytes = buf.byteLength;
    const co2 = bytes * 5e-7; // very rough estimate
    await client.execute(
      'INSERT INTO domain_discovery.carbon_audits (domain, url, scan_date, bytes, co2) VALUES (?, ?, ?, ?, ?)',
      [new URL(url).hostname, url, new Date(), bytes, co2],
      { prepare: true }
    );
  } catch (err) {
    console.log('Audit failed', url, err.toString());
  }
}

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node index.js <url>');
    process.exit(1);
  }
  await client.connect();
  await auditUrl(url);
  await client.shutdown();
}

main();
