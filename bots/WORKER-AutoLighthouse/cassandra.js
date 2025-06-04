const cassandra = require('cassandra-driver');

let client;
const UPDATE_QUERY = `UPDATE domains_processed SET
  desktop_performance_score = ?,
  desktop_accessibility_score = ?,
  desktop_best_practices_score = ?,
  desktop_seo_score = ?,
  desktop_first_contentful_paint = ?,
  desktop_largest_contentful_paint = ?,
  desktop_interactive = ?,
  desktop_speed_index = ?,
  desktop_total_blocking_time = ?,
  desktop_cumulative_layout_shift = ?,
  desktop_timing_total = ?,
  mobile_performance_score = ?,
  mobile_accessibility_score = ?,
  mobile_best_practices_score = ?,
  mobile_seo_score = ?,
  mobile_first_contentful_paint = ?,
  mobile_largest_contentful_paint = ?,
  mobile_interactive = ?,
  mobile_speed_index = ?,
  mobile_total_blocking_time = ?,
  mobile_cumulative_layout_shift = ?,
  mobile_timing_total = ?,
  desktop_performance_suggestions = ?,
  mobile_performance_suggestions = ?,
  desktop_accessibility_suggestions = ?,
  mobile_accessibility_suggestions = ?,
  desktop_seo_suggestions = ?,
  mobile_seo_suggestions = ?,
  lighthouse_version = ?,
  lighthouse_fetch_time = ?,
  lighthouse_url = ?
 WHERE domain = ? AND tld = ?`;

function getConfig() {
  const points = process.env.CASSANDRA_CONTACT_POINTS
    ? process.env.CASSANDRA_CONTACT_POINTS.split(',')
    : ['192.168.1.201', '192.168.1.202', '192.168.1.203', '192.168.1.204'];
  const dataCenter = process.env.CASSANDRA_DC || 'datacenter1';
  const keyspace = process.env.CASSANDRA_KEYSPACE || 'domain_discovery';
  return { points, dataCenter, keyspace };
}


async function connect() {
  const { ExecutionProfile, types } = cassandra;
  const profile = new ExecutionProfile('default', {
    consistency: types.consistencies.localQuorum,
    readTimeout: 120000,
    retry: { retries: 5 }
  });


  const cfg = getConfig();

  client = new cassandra.Client({
    contactPoints: cfg.points,
    localDataCenter: cfg.dataCenter,
    keyspace: cfg.keyspace,

    profiles: [profile]
  });

  await client.connect();
}


async function fetchRandomDomain(batchSize = 50) {
  const query = `SELECT domain, tld, lighthouse_fetch_time, status, updated FROM domains_processed WHERE status = true LIMIT ${batchSize} ALLOW FILTERING`;
  const res = await client.execute(query);
  const candidates = res.rows.filter(
    r => r.lighthouse_fetch_time === null && r.status === true && r.updated
  );
  if (candidates.length === 0) return null;
  const idx = Math.floor(Math.random() * candidates.length);
  const domain = (candidates[idx].domain || '').replace(/\.+$/, '');
  const tld = (candidates[idx].tld || '').replace(/^\.+/, '');
  return { domain, tld };

}

async function saveResults(domain, tld, desktop, mobile) {
  const params = [
    desktop.performance_score,
    desktop.accessibility_score,
    desktop.best_practices_score,
    desktop.seo_score,
    desktop.first_contentful_paint,
    desktop.largest_contentful_paint,
    desktop.interactive,
    desktop.speed_index,
    desktop.total_blocking_time,
    desktop.cumulative_layout_shift,
    desktop.timing_total,
    mobile.performance_score,
    mobile.accessibility_score,
    mobile.best_practices_score,
    mobile.seo_score,
    mobile.first_contentful_paint,
    mobile.largest_contentful_paint,
    mobile.interactive,
    mobile.speed_index,
    mobile.total_blocking_time,
    mobile.cumulative_layout_shift,
    mobile.timing_total,
    desktop.performance_suggestions,
    mobile.performance_suggestions,
    desktop.accessibility_suggestions,
    mobile.accessibility_suggestions,
    desktop.seo_suggestions,
    mobile.seo_suggestions,
    desktop.lighthouse_version || mobile.lighthouse_version || '',
    desktop.lighthouse_fetch_time || mobile.lighthouse_fetch_time || '',
    desktop.url || mobile.url || '',
    domain,
    tld
  ];
  console.log(
    `Saving Lighthouse results for ${domain}.${tld}`,
    JSON.stringify({ desktop, mobile })
  );
  await client.execute(UPDATE_QUERY, params, { prepare: true });
}

async function shutdown() {
  if (client) await client.shutdown();
}


module.exports = { connect, fetchRandomDomain, saveResults, shutdown };

