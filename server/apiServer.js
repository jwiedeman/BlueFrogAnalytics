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

const cassandraClient = new Client({
  contactPoints: (process.env.CASSANDRA_CONTACT_POINTS || '127.0.0.1').split(','),
  localDataCenter: process.env.CASSANDRA_LOCAL_DATA_CENTER || 'datacenter1',
  keyspace: process.env.CASSANDRA_KEYSPACE || 'profiles',
  socketOptions: { readTimeout: 120000 }
});

await cassandraClient.connect();
await cassandraClient.execute(`
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

await cassandraClient.execute(`
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

app.use('/api/tag-health', optionalAuthMiddleware, createTagHealthRouter(updateTest));
app.use('/api/tools', optionalAuthMiddleware, createToolsRouter(updateTest));

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


app.post('/api/audit/accessibility', authMiddleware, async (req, res) => {
  const { url } = req.body;

  if (typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  try {
    const { launch } = await import('chrome-launcher');
    const lh = (await import('lighthouse')).default;
    const chrome = await launch({ chromeFlags: ['--headless'] });
  const options = { port: chrome.port, onlyCategories: ['accessibility'] };
    const result = await lh(url, options);
    await chrome.kill();
    await updateTest(req.uid, 'accessibility', result.lhr);
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
    const chrome = await launch({ chromeFlags: ['--headless'] });
    const options = { port: chrome.port, onlyCategories: ['seo'] };
    const result = await lh(url, options);
    await chrome.kill();
    await updateTest(req.uid, 'seo', result.lhr);
    res.json(result.lhr);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Audit failed' });

  }
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
