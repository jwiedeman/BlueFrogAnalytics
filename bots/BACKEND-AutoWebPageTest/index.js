#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const yargs = require('yargs');
const SitemapGenerator = require('sitemap-generator');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const cassandraClient = require('./cassandra');

// Resolve the best start URL by testing http/https and www/non-www variants
async function resolveStartUrl(domain) {
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch API not found (requires Node.js >= 18)');
  }
  const schemes = ['https://', 'http://'];
  const names = domain.startsWith('www.')
    ? [domain, domain.replace(/^www\./, '')]
    : [domain, `www.${domain}`];
  for (const scheme of schemes) {
    for (const name of names) {
      const attempt = `${scheme}${name}`;
      try {
        const resp = await fetch(attempt, { method: 'HEAD', redirect: 'follow' });
        if (resp.ok) {
          const finalUrl = resp.url.replace(/\/$/, '');
          return finalUrl;
        }
      } catch (err) {
        // HEAD may be unsupported; try GET
        try {
          const resp2 = await fetch(attempt, { method: 'GET', redirect: 'follow' });
          if (resp2.ok) {
            const finalUrl = resp2.url.replace(/\/$/, '');
            return finalUrl;
          }
        } catch (_) {
          // ignore and continue
        }
      }
    }
  }
  throw new Error(`Could not resolve a valid URL for ${domain}`);
}

/**
 * Run WebPageTest using the local CLI binary.
 * @param {string} url - The URL to test
 * @param {string} wptServer - URL of the private WPT server (optional)
 * @param {string} wptKey - API key for WPT server (optional)
 * @returns {Promise<Object>} - Parsed JSON result data
 */
/**
 * Run a WebPageTest via a locally-hosted WPT server using its HTTP API.
 * @param {string} url - The URL to test.
 * @param {string} wptServer - Base URL of the WPT server (e.g., http://localhost).
 * @param {string} wptKey - API key for WPT server (if required).
 * @returns {Promise<Object>} - The JSON result data from WPT.
 */
async function runCliWpt(url, wptServer, wptKey) {
  const server = (wptServer || 'http://localhost').replace(/\/$/, '');
  // Initiate test
  const startUrl = new URL(`${server}/runtest.php`);
  startUrl.searchParams.set('url', url);
  startUrl.searchParams.set('f', 'json');
  if (wptKey) startUrl.searchParams.set('k', wptKey);
  const startResp = await fetch(startUrl.href, { redirect: 'follow' });
  if (!startResp.ok) {
    throw new Error(`WPT test initiation failed: ${startResp.status} ${startResp.statusText}`);
  }
  const startJson = await startResp.json();
  if (startJson.statusCode !== 200) {
    throw new Error(`WPT initiation error: ${startJson.statusText}`);
  }
  const testId = startJson.data.testId;
  // Poll for completion
  const resultUrl = new URL(`${server}/jsonResult.php`);
  resultUrl.searchParams.set('test', testId);
  resultUrl.searchParams.set('f', 'json');
  while (true) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(resultUrl.href, { redirect: 'follow' });
    if (!res.ok) continue;
    const rj = await res.json();
    if (rj.statusCode === 200) {
      return rj.data;
    }
    if (rj.statusCode === 100) {
      continue; // still running
    }
    throw new Error(`WPT test failed: ${rj.statusText}`);
  }
}

async function main() {
  const argv = yargs
    .option('domain', { type: 'string', demandOption: true, describe: 'Domain to crawl (e.g. example.com)' })
    .option('maxDepth', { type: 'number', default: 0, describe: 'Max crawl depth (0 = unlimited)' })
    .option('saveSitemap', { type: 'boolean', default: false, describe: 'Save sitemap as CSV' })
    .option('outputDir', { type: 'string', default: '.', describe: 'Output directory for results' })
    .option('cassandra', { type: 'boolean', default: false, describe: 'Send results to Cassandra (stub)' })
    .option('wptServer', { type: 'string', default: 'http://localhost', describe: 'WebPageTest server URL (e.g., http://localhost)' })
    .option('wptKey', { type: 'string', default: '', describe: 'WebPageTest API key' })
    .help()
    .argv;

  // Resolve the optimal start URL (http/https, www/non-www)
  console.log(`Resolving domain ${argv.domain}...`);
  let site;
  try {
    site = await resolveStartUrl(argv.domain);
  } catch (e) {
    console.error(`Error resolving domain: ${e.message}`);
    process.exit(1);
  }
  console.log(`Starting crawl at ${site}`);
  // Ensure the output directory exists
  if (!fs.existsSync(argv.outputDir)) {
    fs.mkdirSync(argv.outputDir, { recursive: true });
    console.log(`Created output directory ${argv.outputDir}`);
  }
  const generator = new SitemapGenerator(site, {
    maxDepth: argv.maxDepth,
    stripQuerystring: true,
    maxEntriesPerSitemap: 50000,
    filepath: ''
  });

  // Initialize URL set with the start page to ensure at least one URL
  const urls = new Set([site]);
  generator.on('add', url => {
    if (url.startsWith(site)) {
      urls.add(url);
    }
  });

  generator.on('done', async () => {
    const urlList = Array.from(urls);
    console.log(`Discovered ${urlList.length} URL${urlList.length === 1 ? '' : 's'}:`);
    urlList.forEach(u => console.log(`  ${u}`));
    if (urlList.length === 0) {
      console.warn('Warning: no URLs found. Check your domain, protocol, or maxDepth settings.');
    }
    if (argv.saveSitemap) {
      const sitemapFile = path.join(argv.outputDir, `${argv.domain}-sitemap.csv`);
      const csvWriter = createCsvWriter({
        path: sitemapFile,
        header: [{ id: 'url', title: 'URL' }]
      });
      await csvWriter.writeRecords(urlList.map(u => ({ url: u })));
      console.log(`Sitemap saved to ${sitemapFile}`);
    }

    if (argv.cassandra) {
      cassandraClient.init();
    }

    const results = [];
    for (const url of urlList) {
      console.log(`Testing: ${url}`);
      try {
        const json = await runCliWpt(url, argv.wptServer, argv.wptKey);
        const data = {
          url,
          json
        };
        results.push(data);
        if (argv.cassandra) {
          await cassandraClient.send(data);
        }
      } catch (err) {
        console.error(`Error testing ${url}:`, err.message);
      }
    }

    const outputPath = path.join(argv.outputDir, `${argv.domain}-results.json`);
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`Results written to ${outputPath}`);
  });

  generator.start();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});