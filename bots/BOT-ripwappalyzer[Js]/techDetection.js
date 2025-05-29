import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs'; // File system module for logging
import { loadTechnologies } from './utils.js';
import { analyzeCookies } from './cookies.js';
import { analyzeHeaders } from './headers.js';
import { analyzeSSL } from './ssl.js';
import { analyzeNetworkRequests } from './network.js';

puppeteer.use(StealthPlugin());

const LOG_FILE = 'scan_log.txt';

// Function to write logs to a file (overwrites on each run)
function logToFile(message) {
    console.log(message); // Still print logs to console
    fs.appendFileSync(LOG_FILE, message + '\n'); // Append log to file
}

// Clear previous log file
fs.writeFileSync(LOG_FILE, ''); // Overwrite with empty content

async function scanTechnologies(url) {
    logToFile(`\n🚀 [DEBUG] Starting technology scan for: ${url}\n`);

    logToFile(`🔧 [DEBUG] Launching Puppeteer...`);
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // Use randomized User-Agent
    const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_2 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/15.2 Mobile/15E148 Safari/537.36',
    ];
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    await page.setUserAgent(randomUserAgent);
    logToFile(`🕵️ [DEBUG] Spoofed User-Agent: ${randomUserAgent}`);

    try {
        logToFile(`🌍 [DEBUG] Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        logToFile(`✅ [DEBUG] Page loaded successfully!`);
    } catch (error) {
        logToFile(`❌ [DEBUG] Failed to load page: ${error.message}`);
        await browser.close();
        return [];
    }

    logToFile(`📥 [DEBUG] Loading technology detection rules...`);
    const technologies = loadTechnologies();
    logToFile(`📌 [DEBUG] Loaded ${technologies.length} technology patterns.\n`);

    // Verify that technologies have proper names before detection
    logToFile(`📌 [DEBUG] Verifying loaded technologies...`);
    technologies.forEach((tech, index) => {
        if (!tech.name) {
            logToFile(`⚠️ [DEBUG] Tech at index ${index} is missing a name: ${JSON.stringify(tech, null, 2)}`);
        }
    });
    logToFile(`📌 [DEBUG] Technology verification complete.\n`);

    const detected = new Set();

    logToFile(`🔎 [DEBUG] Fetching headers, cookies, SSL, and network requests...`);
    const [headers, cookies, sslData, networkData] = await Promise.all([
        analyzeHeaders(url),
        analyzeCookies(page),
        analyzeSSL(url),
        analyzeNetworkRequests(page),
    ]);

    logToFile(`📌 [DEBUG] Extracted Headers:\n${JSON.stringify(headers, null, 2)}`);
    logToFile(`📌 [DEBUG] Extracted Cookies:\n${JSON.stringify(cookies, null, 2)}`);
    logToFile(`📌 [DEBUG] Extracted SSL Data:\n${JSON.stringify(sslData, null, 2)}`);
    logToFile(`📌 [DEBUG] Extracted Network Requests:\n${JSON.stringify(networkData.map(r => r.url), null, 2)}`);

    logToFile(`📥 [DEBUG] Extracting scripts and JavaScript variables from page...`);
    const [scripts, jsVars] = await Promise.all([
        page.evaluate(() => Array.from(document.querySelectorAll('script[src]'), script => script.src)),
        page.evaluate(() => Object.keys(window)),
    ]);

    logToFile(`📌 [DEBUG] Found ${scripts.length} external scripts.`);
    logToFile(`📌 [DEBUG] Found ${jsVars.length} JavaScript variables.\n`);

    logToFile(`🚀 [DEBUG] Running technology detection...\n`);

    for (const tech of technologies) {
        if (!tech.name) {
            logToFile(`⚠️ [DEBUG] Skipping tech due to missing name: ${JSON.stringify(tech, null, 2)}`);
            continue;
        }

        logToFile(`🔍 [DEBUG] Checking technology: ${tech.name}`);

        if (!tech.js && !tech.scriptSrc && !tech.dom && !tech.headers && !tech.cookies && !tech.network && !tech.ssl) {
            logToFile(`⚠️ [DEBUG] Skipping ${tech.name} (No detection methods found)`);
            continue;
        }

        if (tech.headers) {
            for (const [header, regex] of Object.entries(tech.headers)) {
                try {
                    if (headers[header] && new RegExp(regex, 'i').test(headers[header])) {
                        logToFile(`✅ [DEBUG] [${tech.name}] detected via Header: ${header}`);
                        detected.add(tech.name);
                    }
                } catch (error) {
                    logToFile(`⚠️ [DEBUG] Regex error for ${tech.name} (Header: ${header}): ${error.message}`);
                }
            }
        }

        if (tech.scriptSrc && scripts.some(src => new RegExp(tech.scriptSrc, 'i').test(src))) {
            logToFile(`✅ [DEBUG] [${tech.name}] detected via Script: ${tech.scriptSrc}`);
            detected.add(tech.name);
        }

        if (tech.js && jsVars.some(varName => new RegExp(tech.js, 'i').test(varName))) {
            logToFile(`✅ [DEBUG] [${tech.name}] detected via JS Variable: ${tech.js}`);
            detected.add(tech.name);
        }

        if (tech.cookies) {
            for (const [cookieName, regex] of Object.entries(tech.cookies)) {
                if (cookies.some(cookie => cookie.name === cookieName && new RegExp(regex, 'i').test(cookie.value))) {
                    logToFile(`✅ [DEBUG] [${tech.name}] detected via Cookie: ${cookieName}`);
                    detected.add(tech.name);
                }
            }
        }
    }

    logToFile(`\n🎯 [DEBUG] Scan complete! Found ${detected.size} technologies.\n`);
    logToFile(`📝 [DEBUG] Detected technologies:\n${JSON.stringify(Array.from(detected), null, 2)}`);

    await browser.close();
    return Array.from(detected);
}

export { scanTechnologies };
