#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const crawler = require('./crawler');
const { runLighthouse } = require('./lighthouseRunner');
const { toCsv, getCsvHeader, formatCsvLine } = require('./formatter');
const cassandraClient = require('./cassandra');

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timeout exceeded')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

program
  .name('lighthouse-site-auditor')
  .description('Run Lighthouse audits on all pages of a site')
  .version('0.1.0');

program
  .command('run')
  .description('Run audits for a single site')
  .requiredOption('-u, --url <url>', 'Base URL of the site to audit')
  .option('-o, --output <type>', 'Output format: csv or json', 'csv')
  .option('-d, --output-dir <dir>', 'Directory to save results', 'results')
  .option('-c, --cassandra', 'Send results to Cassandra')
  .option('-n, --concurrency <number>', 'Max concurrent audits', '5')
  .action(async (options) => {
    const { url, output, outputDir, cassandra, concurrency } = options;
    try {
      console.log(`Crawling site: ${url}`);
      const pages = await crawler.crawlSite(url);
      console.log(`Found ${pages.length} pages`);
      console.log('Launching headless Chrome...');
      const { launch } = await import('chrome-launcher');
      const chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'] });
      const port = chrome.port;
      console.log(`Chrome running on port ${port}`);
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      const siteName = new URL(url).hostname;
      const pLimit = require('p-limit');
      const limit = pLimit(parseInt(concurrency, 10) || 5);
      let results = [];
      if (output === 'csv') {
        const filePath = path.join(outputDir, `${siteName}.csv`);
        const ws = fs.createWriteStream(filePath, { encoding: 'utf8' });
        ws.write(getCsvHeader() + '\n');
        const tasks = pages.map(page => limit(async () => {
          console.log(`Auditing: ${page}`);
          const report = await withTimeout(runLighthouse(page, port), 30000);
          results.push({ url: page, report });
          ws.write(formatCsvLine({ url: page, report }) + '\n');
        }));
        await Promise.all(tasks);
        await chrome.kill();
        ws.end();
        console.log(`Results saved to ${filePath}`);
      } else {
        const tasks = pages.map(page => limit(async () => {
          console.log(`Auditing: ${page}`);
          const report = await withTimeout(runLighthouse(page, port), 30000);
          return { url: page, report };
        }));
        results = await Promise.all(tasks);
        await chrome.kill();
        const filePath = path.join(outputDir, `${siteName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
        console.log(`Results saved to ${filePath}`);
      }
      if (cassandra) {
        console.log('Sending results to Cassandra...');
        await cassandraClient.connect();
        await cassandraClient.saveResults(results);
        console.log('Results sent to Cassandra');
      }
      console.log('Done.');
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

program
  .command('db')
  .description('Continuously audit domains from Cassandra')
  .option('-i, --interval <seconds>', 'Pause between checks', '10')
  .option('-w, --workers <number>', 'Number of parallel workers', '1')
  .action(async (options) => {
    const workers = parseInt(options.workers, 10) || 1;
    const interval = parseInt(options.interval, 10) || 10;
    const { fork } = require('child_process');
    const path = require('path');
    const workerPath = path.join(__dirname, 'dbWorker.js');

    const children = [];
    const startWorker = (id) => {
      const child = fork(workerPath, [], {
        env: { ...process.env, WORKER_ID: String(id), INTERVAL: String(interval) }
      });
      children[id - 1] = child;
      child.on('exit', (code, signal) => {
        console.log(`Worker ${id} exited with code ${code} signal ${signal}. Restarting...`);
        startWorker(id);
      });
    };

    for (let i = 1; i <= workers; i++) {
      startWorker(i);
    }

    const cleanup = () => {
      for (const child of children) {
        if (child) child.kill();
      }
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  });

program.parse(process.argv);
