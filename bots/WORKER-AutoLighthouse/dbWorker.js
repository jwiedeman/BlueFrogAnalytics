#!/usr/bin/env node
const cassandraClient = require('./cassandra');
const { runLighthouse } = require('./lighthouseRunner');
const { launch } = require('chrome-launcher');

function gatherPerformanceSuggestions(lhr) {
  const audits = Object.values(lhr.audits || {}).filter(
    a => a.details && a.details.type === 'opportunity'
  );
  return audits
    .map(a => ({
      title: a.title,
      savings: a.details.overallSavingsMs || a.details.overallSavingsBytes || 0,
      displayValue: a.displayValue
    }))
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 5)
    .map(a => `${a.title}${a.displayValue ? ` (${a.displayValue})` : ''}`)
    .join('; ');
}

function gatherCategorySuggestions(lhr, id) {
  const cat = lhr.categories?.[id];
  if (!cat || !Array.isArray(cat.auditRefs)) return '';
  return cat.auditRefs
    .map(ref => lhr.audits?.[ref.id])
    .filter(a => a && typeof a.score === 'number' && a.score < 1)
    .map(a => a.title)
    .join('; ');
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timeout exceeded')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function start(workerId, intervalMs) {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  await cassandraClient.connect();
  const active = new Set();
  let chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });
  let port = chrome.port;
  const cleanup = async () => {
    try {
      await chrome.kill();
    } catch {}
    try {
      await cassandraClient.shutdown();
    } catch {}
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  while (true) {
    const row = await cassandraClient.fetchRandomDomain();
    if (!row) {
      console.log(`[${workerId}] No domains with missing Lighthouse data. Waiting...`);
      await sleep(intervalMs);
      continue;
    }
    const domain = (row.domain || '').replace(/\.+$/, '');
    const tld = (row.tld || '').replace(/^\.+/, '');
    const url = `http://${domain}.${tld}`;
    if (active.has(url)) {
      await sleep(1000);
      continue;
    }
    active.add(url);
    console.log(`[${workerId}] Auditing ${url}`);
    try {
      const desktopReport = await withTimeout(runLighthouse(url, port, 'desktop'), 30000);
      const mobileReport = await withTimeout(runLighthouse(url, port, 'mobile'), 30000);

      const extract = report => {
        const c = report.categories || {};
        const a = report.audits || {};
        return {
          performance_score: c.performance?.score,
          accessibility_score: c.accessibility?.score,
          best_practices_score: c['best-practices']?.score,
          seo_score: c.seo?.score,
          first_contentful_paint: Math.round(a['first-contentful-paint']?.numericValue || 0),
          largest_contentful_paint: Math.round(a['largest-contentful-paint']?.numericValue || 0),
          interactive: Math.round(a.interactive?.numericValue || 0),
          speed_index: Math.round(a['speed-index']?.numericValue || 0),
          total_blocking_time: Math.round(a['total-blocking-time']?.numericValue || 0),
          cumulative_layout_shift: a['cumulative-layout-shift']?.numericValue || 0,
          timing_total: Math.round(report.timing?.total || 0),
          lighthouse_version: report.lighthouseVersion || '',
          lighthouse_fetch_time: report.fetchTime || '',
          url: report.finalDisplayedUrl || '',
          performance_suggestions: gatherPerformanceSuggestions(report),
          accessibility_suggestions: gatherCategorySuggestions(report, 'accessibility'),
          seo_suggestions: gatherCategorySuggestions(report, 'seo')
        };
      };

      const desktop = extract(desktopReport);
      const mobile = extract(mobileReport);

      console.log(
        `[${workerId}] Desktop metrics for ${domain}.${tld}:`,
        JSON.stringify(desktop)
      );
      console.log(
        `[${workerId}] Mobile metrics for ${domain}.${tld}:`,
        JSON.stringify(mobile)
      );

      await cassandraClient.saveResults(domain, tld, desktop, mobile);
      console.log(`[${workerId}] Updated ${domain}.${tld}`);
    } catch (err) {
      console.error(`[${workerId}] Error auditing ${url}:`, err);
      try {
        await chrome.kill();
      } catch {}
      try {
        chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });
        port = chrome.port;
      } catch (e) {
        console.error(`[${workerId}] Failed to restart Chrome:`, e);
      }
    } finally {
      active.delete(url);
    }

    await sleep(intervalMs);
  }
}

const id = process.env.WORKER_ID || 1;
const interval = parseInt(process.env.INTERVAL, 10) || 10;
start(id, interval * 1000);
