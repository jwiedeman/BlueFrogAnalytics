import puppeteer from 'puppeteer';
import { load } from 'cheerio';
import { URL } from 'url';
import http from 'http';
import https from 'https';
import express from 'express';

const DEFAULT_MAX_PAGES = 50;
const MAX_ALLOWED_PAGES = 250;
const REQUEST_TIMEOUT = 15000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

function log(...args) {
  console.log('[tagHealth]', ...args);
}

const ANALYTICS_PATTERNS = {
  google_analytics: {
    src: ['googletagmanager.com/gtag/js', 'google-analytics.com/analytics.js'],
    idRegex: [/G-[A-Z0-9]+/g, /UA-\d+-\d+/g]
  },
  google_tag_manager: {
    src: ['googletagmanager.com/gtm.js'],
    idRegex: [/GTM-[A-Z0-9]+/g]
  },
  segment: {
    src: ['segment.com/analytics.js', 'cdn.segment.com'],
    idRegex: [/analytics\s*\.load\(['"]([A-Za-z0-9]+)['"]\)/gi]
  },
  meta_pixel: {
    src: ['connect.facebook.net', 'facebook.com/tr'],
    idRegex: [
      /fbq\(['"]init['"],\s*['"](\d+)['"]\)/gi,
      /facebook\.com\/tr\?id=(\d+)/gi
    ]
  },
  bing: {
    src: ['bat.bing.com'],
    idRegex: [/['"]?ti['"]?\s*:\s*['"](\d+)['"]/gi]
  },
  adobe_analytics: {
    src: ['assets.adobedtm.com', 'omtrdc.net', '2o7.net'],
    idRegex: [
      /s_account\s*=\s*['"]([\w,]+)['"]/gi,
      /s\.account\s*=\s*['"]([\w,]+)['"]/gi
    ]
  },
  mixpanel: {
    src: ['cdn.mxpnl.com', 'mixpanel.com'],
    idRegex: [/mixpanel\.init\(['"]([A-Za-z0-9]+)['"]\)/gi]
  },
  hotjar: {
    src: ['static.hotjar.com', 'script.hotjar.com'],
    idRegex: [/_hjSettings\s*=\s*\{[^}]*hjid\s*:\s*(\d+)/gi]
  },
  amplitude: {
    src: ['amplitude.com', 'cdn.amplitude.com'],
    idRegex: [/amplitude\.init\(['"]([A-Za-z0-9-_]+)['"]\)/gi]
  }
};

function cleanDomain(domain) {
  domain = (domain || '').trim();
  if (!domain) return '';

  const tryParse = d => {
    try {
      const parsed = new URL(d.includes('://') ? d : `http://${d}`);
      let host = parsed.hostname.replace(/^www\./, '');
      host = host.replace(/^https?/, '');
      return host.replace(/\/$/, '');
    } catch {
      return null;
    }
  };

  let host = tryParse(domain);
  if (host) return host;

  const variants = [
    domain.replace(/^https?:/i, ''),
    domain.replace(/^https?/i, ''),
    domain.replace(/^www\./i, '')
  ];
  for (const v of variants) {
    host = tryParse(v);
    if (host) return host;
  }

  return '';
}

function findAnalytics(html) {
  const $ = load(html);
  const text = $.html();
  const detected = {};

  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    for (const [name, patterns] of Object.entries(ANALYTICS_PATTERNS)) {
      for (const p of patterns.src) {
        if (src.includes(p)) {
          detected[name] = detected[name] || { ids: new Set(), method: null };
        }
      }
    }
  });

  for (const [name, patterns] of Object.entries(ANALYTICS_PATTERNS)) {
    for (const regex of patterns.idRegex) {
      let match;
      while ((match = regex.exec(text))) {
        detected[name] = detected[name] || { ids: new Set(), method: null };
        detected[name].ids.add(match[1] || match[0]);
      }
    }
  }

  if (detected.google_analytics) {
    if (detected.google_tag_manager) {
      detected.google_analytics.method = 'via gtm';
    } else if (detected.segment) {
      detected.google_analytics.method = 'via segment';
    } else {
      detected.google_analytics.method = 'native';
    }
  }

  if (detected.google_tag_manager && !detected.google_tag_manager.method) {
    detected.google_tag_manager.method = 'native';
  }
  if (detected.segment && !detected.segment.method) {
    detected.segment.method = 'native';
  }
  if (detected.meta_pixel && !detected.meta_pixel.method) {
    detected.meta_pixel.method = 'native';
  }
  if (detected.bing && !detected.bing.method) {
    detected.bing.method = 'native';
  }

  return detected;
}

function mergeAnalytics(target, pageData) {
  for (const [name, data] of Object.entries(pageData)) {
    const entry = target[name] || { ids: new Set(), method: data.method };
    data.ids.forEach(id => entry.ids.add(id));
    if (!entry.method && data.method) entry.method = data.method;
    target[name] = entry;
  }
}

function serializeAnalytics(data) {
  const out = {};
  for (const [name, info] of Object.entries(data)) {
    out[name] = { ids: Array.from(info.ids), method: info.method };
  }
  return out;
}

function directFetch(url) {
  const lib = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    log('directFetch', url);
    const req = lib.get(url, { timeout: REQUEST_TIMEOUT }, res => {
      if (res.statusCode >= 400) {
        reject(new Error(`Status ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', chunk => {
        data += chunk;
      });
      res.on('end', () => resolve(data));
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.on('error', reject);
  });
}

function fetchRedirectChain(url, chain = [], maxRedirects = 5) {
  const lib = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    log('redirectCheck', url);
    const req = lib.get(url, { timeout: REQUEST_TIMEOUT }, res => {
      chain.push({ url, status: res.statusCode });
      if (
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location &&
        maxRedirects > 0
      ) {
        const nextUrl = new URL(res.headers.location, url).toString();
        res.resume();
        fetchRedirectChain(nextUrl, chain, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
        return;
      }

      res.resume();
      resolve({ status: res.statusCode, finalUrl: url, chain });
    });
    req.on('timeout', () => {
      req.destroy();
      chain.push({ url, error: 'Timeout' });
      reject({ error: 'Timeout', chain });
    });
    req.on('error', err => {
      chain.push({ url, error: err.message });
      reject({ error: err.message, chain });
    });
  });
}

async function resolveVariants(domain) {
  const results = {};
  const working = [];
  log('resolveVariants', domain);
  const hosts = [domain, `www.${domain}`];
  for (const host of hosts) {
    let success = false;
    for (const scheme of ['https', 'http']) {
      const url = `${scheme}://${host}`;
      log('checkVariant', url);
      try {
        const info = await fetchRedirectChain(url);
        results[url] = {
          status: info.status,
          final_url: info.finalUrl,
          chain: info.chain
        };
        if (!success && info.status < 400) {
          log('variantWorking', info.finalUrl);
          working.push(info.finalUrl);
          success = true;
        }
        if (info.status < 400) break;
      } catch (err) {
        log('variantError', url, err.error || err.message);
        results[url] = { error: err.error || err.message, chain: err.chain };
      }
    }
  }
  return { working: Array.from(new Set(working)), variantResults: results };
}

async function fetchPage(page, url) {
  log('fetchPage', url);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
    return await page.content();
  } catch (err) {
    try {
      return await directFetch(url);
    } catch {
      return null;
    }
  }
}

async function crawlVariant(page, baseUrl, visited, scannedUrls, found, pageResults, queue, maxPages, progress) {
  const baseHost = new URL(baseUrl).host;
  while (queue.length && scannedUrls.length < maxPages) {
    const url = queue.shift();
    log('crawlPage', url);
    if (visited.has(url)) continue;
    visited.add(url);
    const html = await fetchPage(page, url);
    if (!html) continue;
    scannedUrls.push(url);
    if (progress) progress({ url, scanned: scannedUrls.length });
    const pageData = findAnalytics(html);
    mergeAnalytics(found, pageData);
    pageResults[url] = serializeAnalytics(pageData);
    const $ = load(html);
    $('a[href]').each((_, el) => {
      const link = new URL($(el).attr('href'), url).href;
      if (new URL(link).host === baseHost && !visited.has(link) && scannedUrls.length + queue.length < maxPages) {
        queue.push(link);
      }
    });
  }
}

async function scanVariants(variants, progress = () => {}, maxPages = DEFAULT_MAX_PAGES) {
  const scanned = [];
  const working = [];
  const found = {};
  const pageResults = {};
  const visited = new Set();

  const launchOpts = { headless: 'new', args: ['--no-sandbox'] };
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOpts.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const browser = await puppeteer.launch(launchOpts);
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);

  try {
    for (const base of variants) {
      if (scanned.length >= maxPages) break;
      log('scanVariant', base);
      const html = await fetchPage(page, base);
      if (!html) continue;
      working.push(base);
      scanned.push(base);
      visited.add(base);
      const baseData = findAnalytics(html);
      mergeAnalytics(found, baseData);
      pageResults[base] = serializeAnalytics(baseData);
      const $ = load(html);
      const queue = [];
      $('a[href]').each((_, el) => {
        const link = new URL($(el).attr('href'), base).href;
        if (new URL(link).host === new URL(base).host && !visited.has(link)) {
          queue.push(link);
        }
      });
      await crawlVariant(page, base, visited, scanned, found, pageResults, queue, maxPages, progress);
    }
    const result = {};
    for (const [name, data] of Object.entries(found)) {
      result[name] = { ids: Array.from(data.ids), method: data.method };
    }
    return {
      working_variants: working,
      scanned_urls: scanned,
      found_analytics: result,
      page_results: pageResults
    };
  } finally {
    await browser.close();
  }
}

export function createTagHealthRouter(updateTest, updateDomainRegistry, saveTagHealthResult) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const domain = cleanDomain(req.body.domain || '');
    if (!domain) {
      return res.status(400).json({
        error: 'Invalid domain. Please enter a domain like example.com'
      });
    }
    const maxPagesInput = parseInt(req.body.maxPages, 10);
    const maxPages = Math.min(
      MAX_ALLOWED_PAGES,
      isNaN(maxPagesInput) ? DEFAULT_MAX_PAGES : Math.max(1, maxPagesInput)
    );
    log('POST /api/tag-health', domain, maxPages);
    try {
      const { working, variantResults } = await resolveVariants(domain);
      let result = {
        working_variants: [],
        scanned_urls: [],
        found_analytics: {},
        page_results: {}
      };
      if (working.length) {
        result = await scanVariants(working, undefined, maxPages);
      }
      result.variant_results = variantResults;
      if (updateTest && req.uid) {
        await updateTest(req.uid, 'tag_health', result);
      }
      const hasGa = !!(result.found_analytics.google_analytics || result.found_analytics.google_tag_manager);
      if (typeof updateDomainRegistry === 'function') {
        await updateDomainRegistry(domain, { contains_gtm_or_ga: hasGa });
      }
      if (saveTagHealthResult) {
        await saveTagHealthResult(domain, result);
      }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.toString() });
    }
  });

  router.get('/stream', (req, res) => {
    const domain = cleanDomain(req.query.domain || '');
    if (!domain) {
      res.status(400).json({
        error: 'Invalid domain. Please enter a domain like example.com'
      });
      return;
    }
    const maxPagesInput = parseInt(req.query.maxPages, 10);
    const maxPages = Math.min(
      MAX_ALLOWED_PAGES,
      isNaN(maxPagesInput) ? DEFAULT_MAX_PAGES : Math.max(1, maxPagesInput)
    );
    log('STREAM start', domain, maxPages);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.status(200);
    res.flushHeaders();

    const job = { domain, maxPages, res, running: false };
    jobQueue.push(job);
    log('queued', domain);
    broadcastQueue();
    runNext();

    res.on('close', () => {
      if (!job.running) {
        const idx = jobQueue.indexOf(job);
        if (idx !== -1) {
          jobQueue.splice(idx, 1);
          broadcastQueue();
        }
      }
      log('stream closed', domain);
    });
  });

  const activeJobs = new Set();
  const jobQueue = [];

  function broadcastQueue() {
    log('queue length', jobQueue.length);
    jobQueue.forEach((job, idx) => {
      try {
        job.res.write(`event: queue\ndata: ${JSON.stringify({ position: idx + 1 })}\n\n`);
      } catch {}
    });
  }

  function runNext() {
    while (activeJobs.size < 2 && jobQueue.length) {
      const job = jobQueue.shift();
      activeJobs.add(job);
      job.running = true;
      log('start job', job.domain);
      job.res.write(`event: queue\ndata: ${JSON.stringify({ position: 0 })}\n\n`);
      startJob(job);
    }
    broadcastQueue();
  }

  async function startJob(job) {
    const { domain, maxPages, res } = job;
    log('job scanning', domain);
    try {
      const { working, variantResults } = await resolveVariants(domain);
      res.write(`data: ${JSON.stringify({ variant_results: variantResults })}\n\n`);
      let result = {
        working_variants: [],
        scanned_urls: [],
        found_analytics: {},
        page_results: {}
      };
      if (working.length) {
        result = await scanVariants(
          working,
          update => {
            res.write(`data: ${JSON.stringify(update)}\n\n`);
          },
          maxPages
        );
      }
      result.variant_results = variantResults;
      if (updateTest && job.uid) {
        await updateTest(job.uid, 'tag_health', result);
      }
      const hasGa = !!(result.found_analytics.google_analytics || result.found_analytics.google_tag_manager);
      if (typeof updateDomainRegistry === 'function') {
        await updateDomainRegistry(domain, { contains_gtm_or_ga: hasGa });
      }
      if (saveTagHealthResult) {
        await saveTagHealthResult(domain, result);
      }
      res.write(`data: ${JSON.stringify({ done: true, result })}\n\n`);
      res.end();
      log('job finished', domain);
    } catch (err) {
      try {
        res.write(`event: error\ndata: ${JSON.stringify({ error: err.toString() })}\n\n`);
      } finally {
        res.end();
      }
      log('job error', domain, err.toString());
    } finally {
      activeJobs.delete(job);
      runNext();
    }
  }

  return router;
}
