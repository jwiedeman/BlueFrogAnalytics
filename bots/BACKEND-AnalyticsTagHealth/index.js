import { Client } from 'cassandra-driver';

const client = new Client({
  contactPoints: ['192.168.1.201', '192.168.1.202', '192.168.1.203', '192.168.1.204'],
  localDataCenter: 'datacenter1',
  keyspace: 'domain_discovery'
});

async function checkDomain(domain, tld) {
  const host = `${domain}.${tld}`;
  let html = '';
  try {
    const resp = await fetch(`http://${host}`);
    html = await resp.text();
  } catch (err) {
    console.log('Fetch error', host, err.toString());
    return;
  }
  const found = {};
  if (/googletagmanager\.com|gtag\/js/i.test(html)) {
    found.google_tag_manager = true;
  }
  if (/google-analytics\.com/i.test(html)) {
    found.google_analytics = true;
  }
  const row = {
    domain,
    scan_date: new Date(),
    working_variants: [`http://${host}`],
    scanned_urls: [`http://${host}`],
    found_analytics: found,
    page_results: {},
    variant_results: {},
    compliance_status: Object.keys(found).length ? 'found' : 'missing'
  };
  await client.execute(
    'INSERT INTO domain_discovery.analytics_tag_health (domain, scan_date, working_variants, scanned_urls, found_analytics, page_results, variant_results, compliance_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      row.domain,
      row.scan_date,
      row.working_variants,
      row.scanned_urls,
      row.found_analytics,
      row.page_results,
      row.variant_results,
      row.compliance_status
    ],
    { prepare: true }
  );
}

async function main() {
  await client.connect();
  const rs = await client.execute('SELECT domain, tld FROM domains_processed');
  for (const r of rs.rows) {
    await checkDomain(r.domain, r.tld);
  }
  await client.shutdown();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
