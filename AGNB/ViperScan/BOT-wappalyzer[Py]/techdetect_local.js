// techdetect_local.js
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Initialize PostgreSQL Connection Pool ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
console.log("DATABASE_URL =", process.env.DATABASE_URL);

// --- Database Functions ---
async function resetInProgressDomains() {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE domains
      SET techdetect = NULL
      WHERE techdetect::jsonb @> '{"status": "in-progress"}';
    `);
    console.log("Cleared all in-progress tech detection statuses.");
  } catch (err) {
    console.error("Error resetting in-progress domains:", err);
  } finally {
    client.release();
  }
}

async function fetchDomain() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      UPDATE domains
      SET techdetect = '{"status": "in-progress"}'
      WHERE domain = (
        SELECT domain FROM domains 
        WHERE status = 1 AND techdetect IS NULL 
        LIMIT 1 FOR UPDATE SKIP LOCKED
      )
      RETURNING domain;
    `);
    if (res.rows.length) {
      return res.rows[0].domain;
    }
  } catch (err) {
    console.error("Error fetching domain:", err);
  } finally {
    client.release();
  }
  return null;
}

async function updateTechDetect(domain, techInfo) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE domains SET techdetect = $1 WHERE domain = $2;`,
      [JSON.stringify(techInfo), domain]
    );
  } catch (err) {
    console.error(`Error updating database for ${domain}:`, err);
  } finally {
    client.release();
  }
}

async function markUnreachable(domain) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE domains SET techdetect = '{"status": "unreachable"}' WHERE domain = $1;`,
      [domain]
    );
  } catch (err) {
    console.error(`Error marking ${domain} as unreachable:`, err);
  } finally {
    client.release();
  }
}

// --- Regex Fixing and Pattern Parsing Functions ---
function escapeDashesInCharClasses(patternStr) {
  return patternStr.replace(/\[[^\]]+\]/g, (match) => {
    const inner = match.slice(1, -1);
    const fixedInner = inner.replace(/(?<!\\)-(?!$)/g, '\\-');
    return `[${fixedInner}]`;
  });
}

function fixPattern(patternStr) {
  // Remove one or more backslashes preceding colons and semicolons.
  let fixed = patternStr.replace(/\\+:/g, ":").replace(/\\+;/g, ";");
  fixed = escapeDashesInCharClasses(fixed);
  if (fixed.endsWith("\\")) {
    fixed = fixed.slice(0, -1);
  }
  return fixed;
}

function parsePattern(pattern, isRegex = true) {
  const parts = pattern.split(";");
  const value = parts[0];
  let confidence = 100;
  let version = "";
  for (let i = 1; i < parts.length; i++) {
    const attr = parts[i];
    const [key, val] = attr.split(":", 2);
    if (key && key.trim() === "confidence") {
      confidence = parseInt(val.trim()) || 100;
    } else if (key && key.trim() === "version") {
      version = val.trim();
    }
  }
  let regex = null;
  try {
    const valueFixed = fixPattern(value);
    if (isRegex) {
      regex = new RegExp(valueFixed, "i");
    }
  } catch (err) {
    console.error(`Error compiling regex for pattern ${value}:`, err.message);
  }
  return { value, regex, confidence, version };
}

function transformPatterns(value, isRegex = true) {
  if (typeof value === "string") {
    return [parsePattern(value, isRegex)];
  } else if (Array.isArray(value)) {
    const result = [];
    for (const item of value) {
      if (typeof item === "string") {
        result.push(parsePattern(item, isRegex));
      } else if (typeof item === "object") {
        for (const k in item) {
          try {
            result.push({ ...parsePattern(String(item[k]), isRegex), subkey: k });
          } catch (err) {
            continue;
          }
        }
      } else {
        try {
          result.push(parsePattern(String(item), isRegex));
        } catch (err) {
          continue;
        }
      }
    }
    return result;
  } else if (typeof value === "object") {
    const result = [];
    for (const k in value) {
      try {
        result.push({ ...parsePattern(String(value[k]), isRegex), subkey: k });
      } catch (err) {
        continue;
      }
    }
    return result;
  } else {
    try {
      return [parsePattern(String(value), isRegex)];
    } catch (err) {
      return [];
    }
  }
}

function transformTechnology(tech) {
  const patternKeys = [
    "cookies", "js", "dom", "dns", "headers", "html", "text",
    "css", "robots", "probe", "scriptSrc", "scripts", "url", "xhr", "meta"
  ];
  for (const key of patternKeys) {
    if (tech[key]) {
      tech[key] = transformPatterns(tech[key], true);
    }
  }
  return tech;
}

function toList(value) {
  return Array.isArray(value) ? value : [value];
}

// --- Detection Routine ---
function runDetection(items, technologies) {
  const detections = [];
  for (const techName in technologies) {
    const tech = technologies[techName];
    for (const key of [
      "cookies", "js", "dom", "dns", "headers", "html", "text",
      "css", "robots", "probe", "scriptSrc", "scripts", "url", "xhr", "meta"
    ]) {
      if (items[key] && tech[key]) {
        const values = toList(items[key]);
        for (const pattern of tech[key]) {
          if (pattern.regex) {
            for (const value of values) {
              const match = pattern.regex.exec(value);
              if (match && match[0].trim() !== "") {
                detections.push({
                  technology: tech,
                  pattern,
                  match: match[0],
                  detectedIn: key,
                  confidence: pattern.confidence || 100,
                  version: pattern.version || ""
                });
              }
            }
          }
        }
      }
    }
  }
  return detections;
}

// --- Load Local Wappalyzer Definitions ---
function loadLocalTechnologies() {
  const techDir = path.join(__dirname, "src", "technologies");
  const catFile = path.join(__dirname, "src", "categories.json");
  const grpFile = path.join(__dirname, "src", "groups.json");

  let technologies = {};
  try {
    const files = fs.readdirSync(techDir);
    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(techDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        technologies = { ...technologies, ...data };
      }
    }
  } catch (err) {
    console.error("Error loading technologies:", err);
  }
  let categories = {};
  try {
    categories = JSON.parse(fs.readFileSync(catFile, "utf8"));
  } catch (err) {
    console.error("Error loading categories.json:", err);
  }
  let groups = {};
  try {
    groups = JSON.parse(fs.readFileSync(grpFile, "utf8"));
  } catch (err) {
    console.error("Error loading groups.json:", err);
  }
  const transformed = {};
  for (const techName in technologies) {
    // Ensure each technology has a name property.
    transformed[techName] = { name: techName, ...transformTechnology(technologies[techName]) };
  }
  return { technologies: transformed, categories, groups };
}

// --- URL Variant Testing ---
function getVariants(domain) {
  let stripped = domain.replace(/^https?:\/\//i, '');
  stripped = stripped.replace(/^www\./i, '');
  return [
    `http://${stripped}`,
    `https://${stripped}`,
    `http://www.${stripped}`,
    `https://www.${stripped}`
  ];
}

async function tryVariants(domain) {
  const variants = getVariants(domain);
  for (const url of variants) {
    //console.log(`Trying URL variant: ${url}`);
    const { detections, finalUrl } = await analyzeSite(url);
    if (detections && detections.length > 0) {
      // Use finalUrl if available (if a redirect occurred)
      return { detections, usedUrl: finalUrl || url };
    }
  }
  return { detections: null, usedUrl: null };
}

// --- Analyze Site Using Transformed Patterns ---
// Use node-fetch to get the page content.
async function analyzeSite(url) {
  try {
    const { technologies } = loadLocalTechnologies();
    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const finalUrl = response.url;
    const html = await response.text();
    const headers = Array.from(response.headers.entries())
      .map(([k, v]) => `${k}: ${v}`)
      .join(" ");
    const items = { html, headers };
    const detections = runDetection(items, technologies);
    return { detections, finalUrl };
  } catch (err) {
    return { detections: null, finalUrl: null };
  }
}

// --- Worker Function ---
async function worker() {
  while (true) {
    const domain = await fetchDomain();
    if (!domain) break;
    const { detections, usedUrl } = await tryVariants(domain);
    if (detections && detections.length > 0) {
      await updateTechDetect(domain, detections);
      // Extract unique technology names
      const techNames = [...new Set(detections.map(d => d.technology.name).filter(Boolean))];
      let logLine = `Finished analyzing ${domain} (using ${usedUrl}): ${techNames.join(', ')}`;
      // Color the output green if any tech name contains "shopify", "wordpress", or "google ads"
      const lowerNames = techNames.map(name => name.toLowerCase());
      if (lowerNames.some(name => name.includes("shopify") || name.includes("wordpress") || name.includes("google ads"))) {
        logLine = `\x1b[32m${logLine}\x1b[0m`;
      }
      console.log(logLine);
    } else {
      console.log(`No tech info found for ${domain}. Marking as unreachable.`);
      await markUnreachable(domain);
    }
  }
}

// --- Progress Reporting ---
async function displayProgress() {
  while (true) {
    const client = await pool.connect();
    try {
      const res = await client.query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN techdetect IS NULL THEN 1 ELSE 0 END) AS unresolved,
          SUM(CASE WHEN techdetect IS NOT NULL THEN 1 ELSE 0 END) AS resolved,
          SUM(CASE WHEN techdetect::jsonb @> '{"status": "in-progress"}' THEN 1 ELSE 0 END) AS in_progress,
          SUM(CASE WHEN techdetect::jsonb @> '{"status": "unreachable"}' THEN 1 ELSE 0 END) AS unreachable
        FROM domains;
      `);
      const { total, unresolved, resolved, in_progress, unreachable } = res.rows[0];
      console.clear();
      console.log("\nProgress Report:");
      console.log(`Total Domains: ${total}`);
      console.log(`Resolved Domains: ${resolved}`);
      console.log(`Unresolved Domains: ${unresolved}`);
      console.log(`In Progress: ${in_progress}`);
      console.log(`Unreachable: ${unreachable}`);
    } catch (err) {
      console.error("Error fetching progress:", err);
    } finally {
      client.release();
    }
    await new Promise(resolve => setTimeout(resolve, 120000));
  }
}

// --- Main Function ---
async function main() {
  await resetInProgressDomains();
  
  // Start progress reporting in background
  displayProgress();

  const workerCount = 50;
  const workers = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  console.log("All domains processed.");
}

main().catch(err => {
  console.error("Main error:", err);
  process.exit(1);
});
