// Main API server providing profile management and website test endpoints
import express from 'express';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { Client } from 'cassandra-driver';
import { createHash } from 'crypto';
import fs from 'fs';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';
import { createTagHealthRouter } from './tagHealth.js';
import { createToolsRouter } from "./tools.js";
import { createSpecRouter } from './specifications.js';
import { spawn, spawnSync } from 'child_process';
import os from 'os';
import path from 'path';
import dotenv from 'dotenv';
import http from 'http';
import https from 'https';
import puppeteer from 'puppeteer';

// Load environment variables from server/.env if present
dotenv.config({ path: new URL('./.env', import.meta.url).pathname });

// Automatically set CHROME_PATH from Puppeteer's bundled Chrome if not provided
if (!process.env.CHROME_PATH) {
  try {
    process.env.CHROME_PATH = puppeteer.executablePath();
  } catch (err) {
    console.warn('Unable to determine Chrome executable path:', err?.message || err);
  }
}

// Basic security headers and rate limiting without extra dependencies
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
};

const rateMap = new Map();
const RATE_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT = 100;
const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const hits = (rateMap.get(ip) || []).filter(ts => now - ts < RATE_WINDOW);
  hits.push(now);
  rateMap.set(ip, hits);
  if (hits.length > RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  next();
};

async function ensureKeyspace(client, name) {
  await client.execute(
    `CREATE KEYSPACE IF NOT EXISTS ${name} WITH replication = {'class':'SimpleStrategy','replication_factor':1}`
  );
}

async function columnExists(client, keyspace, table, column) {
  const result = await client.execute(
    'SELECT column_name FROM system_schema.columns WHERE keyspace_name=? AND table_name=? AND column_name=?',
    [keyspace, table, column],
    { prepare: true }
  );
  return result.rowLength > 0;
}

async function ensureColumns(client, keyspace, table, defs) {
  for (const [name, type] of Object.entries(defs)) {
    if (!(await columnExists(client, keyspace, table, name))) {
      await client.execute(`ALTER TABLE ${keyspace}.${table} ADD ${name} ${type}`);
    }
  }
}

async function initCassandra() {
  const contactPoints = (process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1').split(',');
  const localDataCenter = process.env.CASSANDRA_LOCAL_DATA_CENTER || 'datacenter1';
  const keyspace = process.env.CASSANDRA_KEYSPACE || 'profiles';

  const admin = new Client({ contactPoints, localDataCenter });
  await admin.connect();
  await ensureKeyspace(admin, 'profiles');
  await ensureKeyspace(admin, 'domain_discovery');
  await admin.shutdown();

  const client = new Client({
    contactPoints,
    localDataCenter,
    keyspace,
    socketOptions: { readTimeout: 120000 }
  });
  await client.connect();

  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      uid text PRIMARY KEY,
      first_name text,
      last_name text,
      email text,
      phone text,
      payment_preference text,
      domains text,
      tests text
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS billing_info (
      uid text PRIMARY KEY,
      name text,
      address text,
      city text,
      state text,
      postal_code text,
      country text,
      plan text
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS domain_discovery.certstream_domains (
      domain text PRIMARY KEY
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS domain_discovery.domains_processed (
      domain text,
      tld text,
      PRIMARY KEY (domain, tld)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS profiles.user_domain_prefs (
      domain text,
      tld text,
      uid text,
      refresh_hours int,
      PRIMARY KEY ((domain, tld), uid)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS domain_discovery.domain_page_metrics (
      domain text,
      url text,
      scan_date timestamp,
      PRIMARY KEY (domain, url, scan_date)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS domain_discovery.analytics_tag_health (
      domain text,
      scan_date timestamp,
      PRIMARY KEY (domain, scan_date)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS domain_discovery.carbon_audits (
      domain text,
      url text,
      scan_date timestamp,
      PRIMARY KEY (domain, url, scan_date)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS domain_discovery.misc_tool_results (
      domain text,
      url text,
      tool_name text,
      scan_date timestamp,
      PRIMARY KEY (domain, url, tool_name, scan_date)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS domain_discovery.businesses (
      name text,
      address text,
      website text,
      phone text,
      reviews_average float,
      query text,
      latitude float,
      longitude float,
      PRIMARY KEY (name, address)
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS domain_discovery.tracking_specs (
      category text,
      tool text,
      name text,
      rule text,
      example text,
      description text,
      updated_at timestamp,
      PRIMARY KEY ((category, tool), name)
    )
  `);

  await ensureColumns(client, 'domain_discovery', 'domains_processed', {
    registered: 'timestamp',
    registrar: 'text',
    updated: 'timestamp',
    status: 'text',
    as_name: 'text',
    as_number: 'int',
    isp: 'text',
    org: 'text',
    city: 'text',
    region: 'text',
    region_name: 'text',
    country: 'text',
    country_code: 'text',
    continent: 'text',
    continent_code: 'text',
    lat: 'float',
    lon: 'float',
    languages: 'list<text>',
    phone: 'text',
    time_zone: 'text',
    ssl_issuer: 'text',
    tech_detect: 'list<text>',
    site_type: 'text',
    site_category: 'text',
    site_type_tags: 'list<text>',
    title: 'text',
    description: 'text',
    linkedin_url: 'text',
    has_about_page: 'boolean',
    has_services_page: 'boolean',
    has_cart_or_product: 'boolean',
    contains_gtm_or_ga: 'boolean',
    wordpress_version: 'text',
    server_type: 'text',
    server_version: 'text',
    emails: 'list<text>',
    sitemap_page_count: 'int',
    desktop_accessibility_score: 'int',
    mobile_accessibility_score: 'int',
    desktop_best_practices_score: 'int',
    mobile_best_practices_score: 'int',
    desktop_performance_score: 'int',
    mobile_performance_score: 'int',
    desktop_seo_score: 'int',
    mobile_seo_score: 'int',
    desktop_first_contentful_paint: 'float',
    mobile_first_contentful_paint: 'float',
    desktop_largest_contentful_paint: 'float',
    mobile_largest_contentful_paint: 'float',
    desktop_interactive: 'float',
    mobile_interactive: 'float',
    desktop_speed_index: 'float',
    mobile_speed_index: 'float',
    desktop_total_blocking_time: 'float',
    mobile_total_blocking_time: 'float',
    desktop_cumulative_layout_shift: 'float',
    mobile_cumulative_layout_shift: 'float',
    desktop_timing_total: 'float',
    mobile_timing_total: 'float',
    lighthouse_version: 'text',
    lighthouse_fetch_time: 'timestamp',
    lighthouse_url: 'text',
    raw_subdomains: 'set<text>',
    desktop_performance_suggestions: 'text',
    mobile_performance_suggestions: 'text',
    desktop_accessibility_suggestions: 'text',
    mobile_accessibility_suggestions: 'text',
    desktop_seo_suggestions: 'text',
    mobile_seo_suggestions: 'text',
    user_managed: 'boolean',
    refresh_hours: 'int',
    last_enriched: 'timestamp'
  });

  await ensureColumns(client, 'domain_discovery', 'domain_page_metrics', {
    desktop_accessibility_score: 'int',
    mobile_accessibility_score: 'int',
    desktop_best_practices_score: 'int',
    mobile_best_practices_score: 'int',
    desktop_performance_score: 'int',
    mobile_performance_score: 'int',
    desktop_seo_score: 'int',
    mobile_seo_score: 'int',
    desktop_first_contentful_paint: 'float',
    mobile_first_contentful_paint: 'float',
    desktop_largest_contentful_paint: 'float',
    mobile_largest_contentful_paint: 'float',
    desktop_interactive: 'float',
    mobile_interactive: 'float',
    desktop_speed_index: 'float',
    mobile_speed_index: 'float',
    desktop_total_blocking_time: 'float',
    mobile_total_blocking_time: 'float',
    desktop_cumulative_layout_shift: 'float',
    mobile_cumulative_layout_shift: 'float',
    desktop_timing_total: 'float',
    mobile_timing_total: 'float',
    lighthouse_version: 'text',
    lighthouse_fetch_time: 'timestamp',
    lighthouse_url: 'text',
    desktop_performance_suggestions: 'text',
    mobile_performance_suggestions: 'text',
    desktop_accessibility_suggestions: 'text',
    mobile_accessibility_suggestions: 'text',
    desktop_seo_suggestions: 'text',
    mobile_seo_suggestions: 'text'
  });

  await ensureColumns(client, 'domain_discovery', 'analytics_tag_health', {
    working_variants: 'list<text>',
    scanned_urls: 'list<text>',
    found_analytics: 'map<text, text>',
    page_results: 'map<text, text>',
    variant_results: 'map<text, text>',
    compliance_status: 'text'
  });

  await ensureColumns(client, 'domain_discovery', 'carbon_audits', {
    bytes: 'int',
    co2: 'float'
  });

  await ensureColumns(client, 'domain_discovery', 'misc_tool_results', {
    data: 'map<text, text>'
  });

  await ensureColumns(client, 'domain_discovery', 'tracking_specs', {
    rule: 'text',
    example: 'text',
    description: 'text',
    updated_at: 'timestamp'
  });

  return client;
}

async function loadDemoSpecs(client) {
  const countResult = await client.execute(
    'SELECT COUNT(*) FROM domain_discovery.tracking_specs'
  );
  const count = countResult.rows[0]['count'];
  const total = typeof count?.toNumber === 'function' ? count.toNumber() : count;
  if (total > 0) return;
  const demo = [
    {
      category: 'event',
      tool: 'google_analytics',
      name: 'page_view',
      rule: 'request_url CONTAINS "collect" AND param t=pageview',
      example: 'https://www.google-analytics.com/collect?v=1&t=pageview',
      description: 'Google Analytics page view beacon'
    },
    {
      category: 'event',
      tool: 'adobe_analytics',
      name: 'page_view',
      rule: 'request_url CONTAINS "/b/ss/" AND param pe=v',
      example: 'https://example.omtrdc.net/b/ss/account/1/JS-1.0/s?pageName=home',
      description: 'Adobe Analytics page view call'
    },
    {
      category: 'dimension',
      tool: 'google_analytics',
      name: 'client_id',
      rule: 'cookie "_ga"',
      example: 'GA1.2.1234567890.1234567890',
      description: 'Unique GA client identifier'
    }
  ];
  for (const row of demo) {
    await client.execute(
      'INSERT INTO domain_discovery.tracking_specs (category, tool, name, rule, example, description, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        row.category,
        row.tool,
        row.name,
        row.rule,
        row.example,
        row.description,
        new Date()
      ],
      { prepare: true }
    );
  }
}

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT ||
  new URL('./serviceAccount.json', import.meta.url).pathname;

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(
    'Missing Firebase service account credentials. Set FIREBASE_SERVICE_ACCOUNT or place serviceAccount.json in the server directory.'
  );
}

const firebaseApp = initializeApp({
  credential: cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')))
});
const firebaseAuth = getAuth(firebaseApp);

const cassandraClient = await initCassandra();
await loadDemoSpecs(cassandraClient);

const app = express();
app.disable('x-powered-by');

// Allow CORS from the main website domains and any subdomain
const allowedOriginPattern = /^https:\/\/(?:[a-z0-9-]+\.)*bluefroganalytics\.com$/i;
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOriginPattern.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    const reqHeaders = req.headers['access-control-request-headers'];
    if (reqHeaders) {
      res.setHeader('Access-Control-Allow-Headers', reqHeaders);
    } else {
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(securityHeaders);
app.use(rateLimiter);

// Allow CORS from the main website domains

app.use((req, res, next) => {
  const { origin } = req.headers;
  if (origin && allowedOriginPattern.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

async function updateTest(uid, name, data) {
  if (!uid) return;
  const result = await cassandraClient.execute(
    'SELECT tests FROM user_profiles WHERE uid = ?',
    [uid],
    { prepare: true }
  );
  let tests = {};
  if (result.rows.length && result.rows[0].tests) {
    try {
      tests = JSON.parse(result.rows[0].tests);
    } catch {}
  }
  tests[name] = data;
  await cassandraClient.execute(
    'UPDATE user_profiles SET tests = ? WHERE uid = ?',
    [JSON.stringify(tests), uid],
    { prepare: true }
  );
}

function parseDomainParts(input) {
  try {
    const url = new URL(input.includes('://') ? input : `http://${input}`);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    const parts = host.split('.');
    if (parts.length < 2) return null;
    const tld = parts.pop();
    const domain = parts.pop();
    return { domain, tld };
  } catch {
    return null;
  }
}

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

async function updateDomainRegistry(url, columns) {
  const parts = parseDomainParts(url);
  if (!parts) return;
  const { domain, tld } = parts;
  const check = await cassandraClient.execute(
    'SELECT domain FROM domain_discovery.domains_processed WHERE domain=? AND tld=?',
    [domain, tld],
    { prepare: true }
  );
  if (!check.rowLength) return;
  const keys = Object.keys(columns);
  if (!keys.length) return;
  const setClause = [...keys.map(k => `${k}=?`), 'last_enriched=?'].join(', ');
  const values = [...keys.map(k => columns[k]), new Date(), domain, tld];
  await cassandraClient.execute(
    `UPDATE domain_discovery.domains_processed SET ${setClause} WHERE domain=? AND tld=?`,
    values,
    { prepare: true }
  );
}

async function savePageMetrics(url, metrics) {
  const parts = parseDomainParts(url);
  if (!parts) return;
  const { domain, tld } = parts;
  const check = await cassandraClient.execute(
    'SELECT domain FROM domain_discovery.domains_processed WHERE domain=? AND tld=?',
    [domain, tld],
    { prepare: true }
  );
  if (!check.rowLength) return;
  const keys = Object.keys(metrics);
  if (!keys.length) return;
  const columns = ['domain', 'url', 'scan_date', ...keys];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [domain, url, new Date(), ...keys.map(k => metrics[k])];
  await cassandraClient.execute(
    `INSERT INTO domain_discovery.domain_page_metrics (${columns.join(', ')}) VALUES (${placeholders})`,
    values,
    { prepare: true }
  );
}

async function saveCarbonAudit(url, bytes, co2) {
  const parts = parseDomainParts(url);
  if (!parts) return;
  const { domain, tld } = parts;
  const check = await cassandraClient.execute(
    'SELECT domain FROM domain_discovery.domains_processed WHERE domain=? AND tld=?',
    [domain, tld],
    { prepare: true }
  );
  if (!check.rowLength) return;
  await cassandraClient.execute(
    'INSERT INTO domain_discovery.carbon_audits (domain, url, scan_date, bytes, co2) VALUES (?, ?, ?, ?, ?)',
    [domain, url, new Date(), bytes, co2],
    { prepare: true }
  );
}

async function saveToolResult(url, tool, data) {
  const parts = parseDomainParts(url);
  if (!parts) return;
  const { domain, tld } = parts;
  const check = await cassandraClient.execute(
    'SELECT domain FROM domain_discovery.domains_processed WHERE domain=? AND tld=?',
    [domain, tld],
    { prepare: true }
  );
  if (!check.rowLength) return;
  const map = {};
  for (const [k, v] of Object.entries(data || {})) {
    map[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  await cassandraClient.execute(
    'INSERT INTO domain_discovery.misc_tool_results (domain, url, tool_name, scan_date, data) VALUES (?, ?, ?, ?, ?)',
    [domain, url, tool, new Date(), map],
    { prepare: true }
  );
}

async function saveTagHealthResult(domainInput, data) {
  const parts = parseDomainParts(domainInput);
  if (!parts) return;
  const { domain, tld } = parts;
  const check = await cassandraClient.execute(
    'SELECT domain FROM domain_discovery.domains_processed WHERE domain=? AND tld=?',
    [domain, tld],
    { prepare: true }
  );
  if (!check.rowLength) return;
  const toMap = obj => {
    const map = {};
    for (const [k, v] of Object.entries(obj || {})) {
      map[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    return map;
  };
  const row = {
    domain,
    scan_date: new Date(),
    working_variants: data.working_variants || [],
    scanned_urls: data.scanned_urls || [],
    found_analytics: toMap(data.found_analytics),
    page_results: toMap(data.page_results),
    variant_results: toMap(data.variant_results),
    compliance_status: data.compliance_status || null
  };
  await cassandraClient.execute(
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

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    req.uid = createHash('sha256').update(decoded.uid).digest('hex');
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

async function optionalAuthMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token && req.query && req.query.token) {
    token = req.query.token;
  }
  if (!token) return next();
  try {
    const decoded = await firebaseAuth.verifyIdToken(token);
    req.uid = createHash('sha256').update(decoded.uid).digest('hex');
  } catch (err) {
    console.warn('Invalid token', err.message);
  }
  next();
}

app.use(
  '/api/tag-health',
  optionalAuthMiddleware,
  createTagHealthRouter(updateTest, updateDomainRegistry, saveTagHealthResult)
);
app.use(
  '/api/tools',
  optionalAuthMiddleware,
  createToolsRouter(updateTest, updateDomainRegistry, saveToolResult, saveCarbonAudit)
);
app.use(
  '/api/specs',
  optionalAuthMiddleware,
  createSpecRouter(cassandraClient)
);

app.post('/api/profile', authMiddleware, async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    phone,
    paymentPreference,
    domains = [],
    tests = {}
  } = req.body;
  if (
    typeof firstName !== 'string' ||
    typeof lastName !== 'string' ||
    typeof email !== 'string' ||
    typeof phone !== 'string' ||
    typeof paymentPreference !== 'string' ||
    !Array.isArray(domains) ||
    typeof tests !== 'object' || tests === null
  ) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  try {
    await cassandraClient.execute(
      'INSERT INTO user_profiles (uid, first_name, last_name, email, phone, payment_preference, domains, tests) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.uid,
        firstName,
        lastName,
        email,
        phone,
        paymentPreference,
        JSON.stringify(domains),
        JSON.stringify(tests)
      ],
      { prepare: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/page-metrics', optionalAuthMiddleware, async (req, res) => {
  const { url } = req.query;
  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid url' });
  }
  try {
    const parts = parseDomainParts(url);
    if (!parts) return res.status(400).json({ error: 'Invalid url' });
    const { domain } = parts;
    const result = await cassandraClient.execute(
      'SELECT * FROM domain_discovery.domain_page_metrics WHERE domain=? AND url=? ORDER BY scan_date DESC LIMIT 1',
      [domain, url],
      { prepare: true }
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/billing', authMiddleware, async (req, res) => {
  const {
    name,
    address,
    city,
    state,
    postalCode,
    country,
    plan
  } = req.body;
  if (
    typeof name !== 'string' ||
    typeof address !== 'string' ||
    typeof city !== 'string' ||
    typeof state !== 'string' ||
    typeof postalCode !== 'string' ||
    typeof country !== 'string' ||
    typeof plan !== 'string'
  ) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  try {
    await cassandraClient.execute(
      'INSERT INTO billing_info (uid, name, address, city, state, postal_code, country, plan) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        req.uid,
        name,
        address,
        city,
        state,
        postalCode,
        country,
        plan
      ],
      { prepare: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/billing', authMiddleware, async (req, res) => {
  try {
    const result = await cassandraClient.execute(
      'SELECT * FROM billing_info WHERE uid = ?',
      [req.uid],
      { prepare: true }
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/performance', authMiddleware, async (req, res) => {
  const { url } = req.body;
  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid url' });
  }
  try {
    const chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox'] });

    const options = {
      port: chrome.port,
      output: 'json',
      onlyCategories: ['performance']
    };

    const { lhr: mobile } = await lighthouse(url, options);
    const { lhr: desktop } = await lighthouse(url, options, desktopConfig);

    await chrome.kill();

    const result = { mobile, desktop };
    await updateTest(req.uid, 'performance', result);
    const metrics = {};
    const extract = (lhr, prefix) => {
      if (!lhr) return;
      const c = lhr.categories || {};
      const a = lhr.audits || {};
      metrics[`${prefix}_performance_score`] = Math.round((c.performance?.score || 0) * 100);
      metrics[`${prefix}_accessibility_score`] = Math.round((c.accessibility?.score || 0) * 100);
      metrics[`${prefix}_best_practices_score`] = Math.round((c['best-practices']?.score || 0) * 100);
      metrics[`${prefix}_seo_score`] = Math.round((c.seo?.score || 0) * 100);
      metrics[`${prefix}_first_contentful_paint`] = a['first-contentful-paint']?.numericValue || null;
      metrics[`${prefix}_largest_contentful_paint`] = a['largest-contentful-paint']?.numericValue || null;
      metrics[`${prefix}_interactive`] = a.interactive?.numericValue || null;
      metrics[`${prefix}_speed_index`] = a['speed-index']?.numericValue || null;
      metrics[`${prefix}_total_blocking_time`] = a['total-blocking-time']?.numericValue || null;
      metrics[`${prefix}_cumulative_layout_shift`] = a['cumulative-layout-shift']?.numericValue || null;
      metrics[`${prefix}_timing_total`] = lhr.timing?.total || null;
      metrics[`${prefix}_performance_suggestions`] = gatherPerformanceSuggestions(lhr);
      metrics[`${prefix}_accessibility_suggestions`] = gatherCategorySuggestions(lhr, 'accessibility');
      metrics[`${prefix}_seo_suggestions`] = gatherCategorySuggestions(lhr, 'seo');
    };
    extract(desktop, 'desktop');
    extract(mobile, 'mobile');
    metrics.lighthouse_version = desktop.lighthouseVersion || mobile.lighthouseVersion;
    metrics.lighthouse_fetch_time = new Date(desktop.fetchTime || mobile.fetchTime || Date.now());
    metrics.lighthouse_url = url;
    await updateDomainRegistry(url, metrics);
    await savePageMetrics(url, metrics);
    result.desktopSuggestions = {
      performance: metrics.desktop_performance_suggestions,
      accessibility: metrics.desktop_accessibility_suggestions,
      seo: metrics.desktop_seo_suggestions
    };
    result.mobileSuggestions = {
      performance: metrics.mobile_performance_suggestions,
      accessibility: metrics.mobile_accessibility_suggestions,
      seo: metrics.mobile_seo_suggestions
    };
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Performance test error' });
  }
});

app.get('/api/profile', authMiddleware, async (req, res) => {
  try {
    const result = await cassandraClient.execute(
      'SELECT * FROM user_profiles WHERE uid = ?',
      [req.uid],
      { prepare: true }
    );
    const profile = result.rows[0] || {};
    if (profile.domains) {
      try {
        profile.domains = JSON.parse(profile.domains);
      } catch {
        profile.domains = [];
      }
    }
    if (profile.tests) {
      try {
        profile.tests = JSON.parse(profile.tests);
      } catch {
        profile.tests = {};
      }
    }
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/user-domain', authMiddleware, async (req, res) => {
  const { domain, refreshHours } = req.body || {};
  if (typeof domain !== 'string' || typeof refreshHours !== 'number') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const parts = parseDomainParts(domain);
  if (!parts) {
    return res.status(400).json({ error: 'Invalid domain' });
  }
  const { domain: name, tld } = parts;
  try {
    await cassandraClient.execute(
      'INSERT INTO profiles.user_domain_prefs (domain, tld, uid, refresh_hours) VALUES (?, ?, ?, ?)',
      [name, tld, req.uid, refreshHours],
      { prepare: true }
    );

    await cassandraClient.execute(
      'INSERT INTO domain_discovery.domains_processed (domain, tld) VALUES (?, ?) IF NOT EXISTS',
      [name, tld],
      { prepare: true }
    );

    const all = await cassandraClient.execute(
      'SELECT refresh_hours FROM profiles.user_domain_prefs WHERE domain=? AND tld=?',
      [name, tld],
      { prepare: true }
    );
    let min = refreshHours;
    all.rows.forEach(r => {
      if (typeof r.refresh_hours === 'number' && r.refresh_hours < min) {
        min = r.refresh_hours;
      }
    });

    await cassandraClient.execute(
      'UPDATE domain_discovery.domains_processed SET user_managed=true, refresh_hours=? WHERE domain=? AND tld=?',
      [min, name, tld],
      { prepare: true }
    );

    const prof = await cassandraClient.execute(
      'SELECT domains FROM user_profiles WHERE uid=?',
      [req.uid],
      { prepare: true }
    );
    let domains = [];
    if (prof.rowLength && prof.rows[0].domains) {
      try {
        domains = JSON.parse(prof.rows[0].domains);
      } catch {
        domains = [];
      }
    }
    const full = `${name}.${tld}`;
    if (!domains.includes(full)) {
      domains.push(full);
      await cassandraClient.execute(
        'UPDATE user_profiles SET domains=? WHERE uid=?',
        [JSON.stringify(domains), req.uid],
        { prepare: true }
      );
    }

    res.json({ success: true, refreshHours: min });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/domain-info', authMiddleware, async (req, res) => {
  let { domain } = req.query;
  if (typeof domain !== 'string') {
    return res.status(400).json({ error: 'Invalid domain' });
  }
  domain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  const host = domain.split('/')[0];
  const parts = host.split('.');
  if (parts.length < 2) {
    return res.status(400).json({ error: 'Invalid domain' });
  }
  const tld = parts.pop();
  const name = parts.join('.');
  try {
    const result = await cassandraClient.execute(
      'SELECT * FROM domain_discovery.domains_processed WHERE domain=? AND tld=?',
      [name, tld],
      { prepare: true }
    );
    res.json(result.rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/domain-pages', authMiddleware, async (req, res) => {
  let { domain } = req.query;
  if (typeof domain !== 'string') {
    return res.status(400).json({ error: 'Invalid domain' });
  }
  domain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
  const host = domain.split('/')[0];
  const parts = host.split('.');
  if (parts.length < 2) {
    return res.status(400).json({ error: 'Invalid domain' });
  }
  const tld = parts.pop();
  const name = parts.join('.');
  try {
    const result = await cassandraClient.execute(
      'SELECT url, desktop_seo_score, mobile_seo_score, desktop_performance_score, mobile_performance_score, scan_date FROM domain_discovery.domain_page_metrics WHERE domain=?',
      [name],
      { prepare: true }
    );
    const map = new Map();
    result.rows.forEach(r => {
      const prev = map.get(r.url);
      if (!prev || r.scan_date > prev.scan_date) {
        map.set(r.url, {
          url: r.url,
          desktop_seo_score: r.desktop_seo_score,
          mobile_seo_score: r.mobile_seo_score,
          desktop_performance_score: r.desktop_performance_score,
          mobile_performance_score: r.mobile_performance_score,
          scan_date: r.scan_date
        });
      }
    });
    res.json(Array.from(map.values()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});


app.post('/api/audit/accessibility', authMiddleware, async (req, res) => {
  const { url } = req.body;

  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  try {
    const { launch } = await import('chrome-launcher');
    const lh = (await import('lighthouse')).default;
    const chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox'] });
  const options = { port: chrome.port, onlyCategories: ['accessibility'] };
    const result = await lh(url, options);
    await chrome.kill();
    await updateTest(req.uid, 'accessibility', result.lhr);
    const score = Math.round((result.lhr.categories?.accessibility?.score || 0) * 100);
    await updateDomainRegistry(url, {
      mobile_accessibility_score: score,
      lighthouse_version: result.lhr.lighthouseVersion,
      lighthouse_fetch_time: new Date(result.lhr.fetchTime || Date.now()),
      lighthouse_url: url
    });
    await savePageMetrics(url, {
      mobile_accessibility_score: score,
      lighthouse_version: result.lhr.lighthouseVersion,
      lighthouse_fetch_time: new Date(result.lhr.fetchTime || Date.now()),
      lighthouse_url: url
    });
    res.json(result.lhr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Audit failed' });
  }
});


app.post('/api/seo-audit', authMiddleware, async (req, res) => {
  const { url } = req.body;

  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  try {
    const { launch } = await import('chrome-launcher');
    const lh = (await import('lighthouse')).default;

    async function runAudit(formFactor) {
      const chrome = await launch({ chromeFlags: ['--headless', '--no-sandbox'] });
      try {
        const options = {
          port: chrome.port,
          onlyCategories: ['seo'],
          emulatedFormFactor: formFactor
        };
        const result = await lh(url, options);
        await chrome.kill();
        return result.lhr;
      } catch (err) {
        await chrome.kill();
        throw err;
      }
    }

    const mobile = await runAudit('mobile');
    const desktop = await runAudit('desktop');

  const result = { mobile, desktop };
  await updateTest(req.uid, 'seo', result);
  const metrics = {
    mobile_seo_score: Math.round((mobile.categories?.seo?.score || 0) * 100),
    desktop_seo_score: Math.round((desktop.categories?.seo?.score || 0) * 100),
    lighthouse_version: desktop.lighthouseVersion || mobile.lighthouseVersion,
    lighthouse_fetch_time: new Date(desktop.fetchTime || mobile.fetchTime || Date.now()),
    lighthouse_url: url,
    mobile_seo_suggestions: gatherCategorySuggestions(mobile, 'seo'),
    desktop_seo_suggestions: gatherCategorySuggestions(desktop, 'seo')
  };
  await updateDomainRegistry(url, metrics);
  await savePageMetrics(url, metrics);
  result.desktopSuggestions = { seo: metrics.desktop_seo_suggestions };
  result.mobileSuggestions = { seo: metrics.mobile_seo_suggestions };
  res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Audit failed' });

  }
});

app.post('/api/test-status', optionalAuthMiddleware, (req, res) => {
  const { name, status } = req.body || {};
  console.log(
    `Test status${req.uid ? ` [${req.uid}]` : ''}: ${name} - ${status}`
  );
  res.json({ ok: true });
});

// Launch the Google Maps scraper worker
app.post('/api/google-maps-scraper', async (req, res) => {
  const { query, total } = req.body;
  if (typeof query !== 'string' || typeof total !== 'number') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  const filename = `maps_${Date.now()}.csv`;
  const outputPath = `output/${filename}`;
  const child = spawn('python', [
    'bots/WORKER-GoogleMapsScraper/worker.py',
    query,
    String(total),
    outputPath
  ]);
  child.on('error', (err) => console.error('scraper error', err));
  child.stderr.on('data', (d) => console.error(d.toString()));
  res.json({ file: outputPath });
});

// Check progress for Google Maps scraper
app.get('/api/google-maps-scraper/progress', async (req, res) => {
  const { file } = req.query;
  if (typeof file !== 'string') {
    return res.status(400).json({ error: 'Missing file' });
  }
  try {
    const safePath = path.normalize(file);
    if (!safePath.startsWith('output/')) {
      return res.status(400).json({ error: 'Invalid file path' });
    }
    let count = 0;
    let last = '';
    if (fs.existsSync(safePath)) {
      const data = await fs.promises.readFile(safePath, 'utf8');
      const lines = data.trim().split(/\r?\n/);
      if (lines.length > 1) {
        count = lines.length - 1;
        const lastLine = lines[lines.length - 1].split(',');
        last = lastLine[0] || '';
      }
    }
    res.json({ count, last });
  } catch (err) {
    console.error('progress error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const port = process.env.PORT || 6001;
const certPath = process.env.SSL_CERT;
const keyPath = process.env.SSL_KEY;
const leDomain = process.env.LE_DOMAIN || 'api.bluefroganalytics.com';

function obtainLetsEncrypt(domain) {
  const leDir = path.resolve('./letsencrypt');
  const certFile = path.join(leDir, 'live', domain, 'fullchain.pem');
  const keyFile = path.join(leDir, 'live', domain, 'privkey.pem');

  if (fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    return { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) };
  }

  console.log('Requesting Let\'s Encrypt certificate for', domain);
  const result = spawnSync('certbot', [
    'certonly',
    '--standalone',
    '--non-interactive',
    '--agree-tos',
    '--register-unsafely-without-email',
    '--config-dir', leDir,
    '--work-dir', path.join(leDir, 'work'),
    '--logs-dir', path.join(leDir, 'logs'),
    '-d', domain
  ]);

  if (result.status === 0 && fs.existsSync(certFile) && fs.existsSync(keyFile)) {
    console.log('Obtained Let\'s Encrypt certificate');
    return { cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) };
  }
  console.error('Failed to obtain Let\'s Encrypt certificate');
  return null;
}

function generateSelfSigned(domain = 'localhost') {
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bfa-ssl-'));
    const keyFile = path.join(dir, 'key.pem');
    const certFile = path.join(dir, 'cert.pem');
    const result = spawnSync('openssl', [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      keyFile,
      '-out',
      certFile,
      '-days',
      '365',
      '-subj',
      `/CN=${domain}`
    ]);
    if (result.status !== 0) {
      console.error(result.stderr.toString());
      return null;
    }
    return { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
  } catch (err) {
    console.error('Failed to generate self-signed certificate', err);
    return null;
  }
}

let server;

let keyPem;
let certPem;
if (certPath && keyPath && fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  keyPem = fs.readFileSync(keyPath);
  certPem = fs.readFileSync(certPath);
} else {
  const letsEncrypt = obtainLetsEncrypt(leDomain);
  if (letsEncrypt) {
    keyPem = letsEncrypt.key;
    certPem = letsEncrypt.cert;
  } else {
    const generated = generateSelfSigned(leDomain);
    if (generated) {
      keyPem = generated.key;
      certPem = generated.cert;
      console.log(`Generated temporary self-signed TLS certificate for ${leDomain}`);
    }
  }
}

if (keyPem && certPem) {
  server = https.createServer({ key: keyPem, cert: certPem }, app);
} else {
  server = http.createServer(app);
}

server.listen(port, () => {
  console.log(`${keyPem ? 'HTTPS' : 'HTTP'} server running on port`, port);
});
