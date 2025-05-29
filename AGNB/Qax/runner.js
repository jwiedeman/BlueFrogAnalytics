const fs = require('fs');
const path = require('path');
// Support multiple browser engines
const { chromium, firefox, webkit } = require('playwright');

async function runScenario(scenarioFile) {
  const data = fs.readFileSync(scenarioFile, 'utf8');
  // Load scenario or flow definition (JSON or YAML)
  let raw;
  if (scenarioFile.endsWith('.json')) raw = JSON.parse(data);
  else raw = require('js-yaml').load(data);
  // Normalize: if raw is an array, treat as a Playwright-DSL flow and convert to scenario object
  let scenario;
  if (Array.isArray(raw)) {
    const flowName = path.basename(scenarioFile, path.extname(scenarioFile));
    scenario = { name: flowName, steps: [] };
    for (const stepObj of raw) {
      const entries = Object.entries(stepObj);
      if (entries.length === 0) continue;
      const [act, param] = entries[0];
      let step = { action: '', parameters: {} };
      switch (act) {
        case 'goto':
          step.action = 'goto';
          step.parameters = { url: param };
          break;
        case 'click':
          step.action = 'click';
          step.parameters = { selector: param };
          break;
        case 'type':
          step.action = 'fill';
          step.parameters = { selector: param.selector, text: param.text };
          break;
        case 'wait':
          step.action = 'wait';
          step.parameters = { seconds: param };
          break;
        case 'wait_for_selector':
          step.action = 'wait_for_selector';
          step.parameters = { selector: param };
          break;
        case 'assert_request':
          step.action = 'assert_request';
          step.parameters = { substring: param };
          break;
        case 'screenshot':
          step.action = 'screenshot';
          step.parameters = { path: param };
          break;
        default:
          console.warn(`Unknown flow action, skipping: ${act}`);
          continue;
      }
      scenario.steps.push(step);
    }
  } else {
    // Standard scenario object
    scenario = raw;
  }
  // Determine logs directory (overrideable via second CLI arg)
  const logsDir = process.argv[3] || path.join(__dirname, 'logs');
  // Support grouping: optional group timestamp and worker index
  const groupTs = process.argv[4] || Date.now();
  const workerIndex = process.argv[5];
  // Parse optional Playwright settings JSON passed as argv[6]
  let settings = {};
  if (process.argv[6]) {
    try {
      settings = JSON.parse(process.argv[6]);
    } catch (e) {
      console.error('Invalid settings JSON:', e);
    }
  }
  // Ensure base logs directory exists
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  // Use a separate temp directory for Playwright artifacts (avoid cluttering logs)
  const os = require('os');
  const tempDir = path.join(os.tmpdir(), 'qatool-temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  process.env.TMPDIR = tempDir;
  // Create run group directory
  const runGroupDir = path.join(logsDir, `${scenario.name}-${groupTs}`);
  if (!fs.existsSync(runGroupDir)) fs.mkdirSync(runGroupDir, { recursive: true });
  // Determine worker-specific directory name (index-browserType-devicePreset)
  const presetLabel = settings.devicePreset ? settings.devicePreset.replace(/\s+/g, '') : '';
  const idxLabel = typeof workerIndex !== 'undefined' ? workerIndex : 'main';
  const workerLabel = `${idxLabel}-${settings.browserType}${presetLabel ? `-${presetLabel}` : ''}`;
  const workerDir = path.join(runGroupDir, workerLabel);
  if (!fs.existsSync(workerDir)) fs.mkdirSync(workerDir, { recursive: true });
  // Configure retry behavior
  const maxRetries = typeof settings.stepRetries === 'number' ? settings.stepRetries : 3;
  // Determine Playwright browser engine
  let pwBrowser;
  switch (settings.browserType) {
    case 'firefox': pwBrowser = firefox; break;
    case 'webkit': pwBrowser = webkit; break;
    default: pwBrowser = chromium; break;
  }
  // Compute total sub-steps (count each non-wait as 1, each wait-second as 1)
  let totalSteps = 0;
  for (const step of scenario.steps) {
    if (step.action === 'wait') {
      const secs = Math.ceil(step.parameters.seconds || 0);
      totalSteps += secs;
    } else {
      totalSteps += 1;
    }
  }
  console.log('SCENARIO_STEPS:' + totalSteps);
  // Launch browser with settings
  const launchOptions = {};
  if (settings.headless !== undefined) launchOptions.headless = settings.headless;
  // Always include sandbox flags for packaged apps
  launchOptions.args = ['--no-sandbox', '--disable-setuid-sandbox'];
  if (Array.isArray(settings.launchArgs)) {
    launchOptions.args = settings.launchArgs.concat(launchOptions.args);
  }
  const browser = await pwBrowser.launch(launchOptions);
  // Generate HAR file path, grouping workers under same timestamp
  // HAR file per worker
  const harFileName = `${scenario.name}-${groupTs}-${idxLabel}.har`;
  const harPath = path.join(workerDir, harFileName);
  // Configure context options for HAR recording, viewport, and browser context settings
  const contextOptions = { recordHar: { path: harPath } };
  // Device presets (Mobile, Tablet, Desktop): apply only for Chromium and WebKit
  if (settings.devicePreset) {
    const isMobilePreset = settings.devicePreset.startsWith('Mobile');
    const isTabletPreset = settings.devicePreset.startsWith('Tablet');
    // Only Chromium and WebKit support isMobile/hasTouch options
    if (pwBrowser === chromium || pwBrowser === webkit) {
      if (isMobilePreset) {
        contextOptions.isMobile = true;
        contextOptions.hasTouch = true;
      } else if (isTabletPreset) {
        contextOptions.hasTouch = true;
      }
    }
    // For Firefox, only viewport emulation is applied; skip isMobile/hasTouch
  }
  if (settings.viewportWidth && settings.viewportHeight) {
    contextOptions.viewport = { width: settings.viewportWidth, height: settings.viewportHeight };
  }
  // Custom user agent if provided
  if (settings.userAgent) {
    contextOptions.userAgent = settings.userAgent;
  }
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  // Disable Playwright timeouts: allow network and interactions to take arbitrarily long
  page.setDefaultTimeout(0);
  page.setDefaultNavigationTimeout(0);
  // Track all request URLs for assert_request steps
  const requests = [];
  page.on('request', req => requests.push(req.url()));
  // Execute each scenario step with retries
  // Track scenario step index for error logging and substep count for progress reporting
  let scenarioStepCounter = 0;
  let executedSteps = 0;
  for (const step of scenario.steps) {
    scenarioStepCounter++;
    let success = false;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Handle actions
        switch (step.action) {
          case 'wait': {
            const secs = Math.ceil(step.parameters.seconds || 0);
            for (let s = 1; s <= secs; s++) {
              executedSteps++;
              console.log(`Executing step ${executedSteps}: wait (${s}/${secs})`);
              await page.waitForTimeout(1000);
            }
            break;
          }
          case 'navigate': {
            executedSteps++;
            console.log(`Executing step ${executedSteps}: navigate to ${step.parameters.url}`);
            await page.goto(step.parameters.url);
            break;
          }
          // Alias DSL 'goto' to navigate
          case 'goto': {
            executedSteps++;
            console.log(`Executing step ${executedSteps}: goto to ${step.parameters.url}`);
            await page.goto(step.parameters.url);
            break;
          }
          case 'click': {
            const sel = step.parameters.selector;
            executedSteps++;
            console.log(`Executing step ${executedSteps}: click ${sel}`);
            // Attempt click if element exists, without waiting for selector
            const handle = await page.$(sel);
            if (handle) {
              await handle.click();
            } else {
              console.warn(`Selector not found, skipping click: ${sel}`);
            }
            break;
          }
          case 'ifSelector': {
            const sel = step.parameters.selector;
            const timeoutMs = (step.parameters.timeout || 0) * 1000;
            executedSteps++;
            console.log(`Executing step ${executedSteps}: conditional wait for '${sel}' up to ${timeoutMs}ms`);
            try {
              await page.waitForSelector(sel, { timeout: timeoutMs });
              console.log(`Condition true: selector '${sel}' found`);
            } catch {
              console.log(`Condition false: selector '${sel}' not found within ${timeoutMs}ms`);
            }
            break;
          }
          case 'fill': {
            executedSteps++;
            console.log(`Executing step ${executedSteps}: fill ${step.parameters.selector}`);
            await page.fill(step.parameters.selector, step.parameters.text);
            break;
          }
          case 'selectOption': {
            executedSteps++;
            console.log(`Executing step ${executedSteps}: selectOption ${step.parameters.selector}`);
            await page.selectOption(step.parameters.selector, step.parameters.value);
            break;
          }
          case 'check': {
            executedSteps++;
            console.log(`Executing step ${executedSteps}: check ${step.parameters.selector}`);
            await page.check(step.parameters.selector);
            break;
          }
          case 'uncheck': {
            executedSteps++;
            console.log(`Executing step ${executedSteps}: uncheck ${step.parameters.selector}`);
            await page.uncheck(step.parameters.selector);
            break;
          }
          case 'hover': {
            executedSteps++;
            console.log(`Executing step ${executedSteps}: hover ${step.parameters.selector}`);
            await page.hover(step.parameters.selector);
            break;
          }
          case 'press': {
            executedSteps++;
            console.log(`Executing step ${executedSteps}: press ${step.parameters.key}`);
            await page.keyboard.press(step.parameters.key);
            break;
          }
          case 'waitForSelector': {
            executedSteps++;
            console.log(`Executing step ${executedSteps}: waitForSelector ${step.parameters.selector}`);
            await page.waitForSelector(step.parameters.selector);
            break;
          }
          // DSL alias
          case 'wait_for_selector': {
            executedSteps++;
            console.log(`Executing step ${executedSteps}: wait_for_selector ${step.parameters.selector}`);
            await page.waitForSelector(step.parameters.selector);
            break;
          }
          case 'reload': {
            executedSteps++;
            console.log(`Executing step ${executedSteps}: reload page`);
            await page.reload();
            break;
          }
          case 'back': {
            executedSteps++;
            console.log(`Executing step ${executedSteps}: navigate back`);
            await page.goBack();
            break;
          }
          case 'forward': {
            executedSteps++;
            console.log(`Executing step ${executedSteps}: navigate forward`);
            await page.goForward();
            break;
          }
          // Assert that a request matching substring was made
          case 'assert_request': {
            executedSteps++;
            const substr = step.parameters.substring;
            console.log(`Executing step ${executedSteps}: assert_request contains "${substr}"`);
            if (!requests.some(u => u.includes(substr))) {
              throw new Error(`Assertion failed: no request matching "${substr}"`);
            }
            break;
          }
          // Screenshot, optionally using a provided filename
          case 'screenshot': {
            executedSteps++;
            // Determine filename: use provided path or default step-based name
            const fname = step.parameters && step.parameters.path
              ? step.parameters.path
              : `step${scenarioStepCounter}.png`;
            console.log(`Executing step ${executedSteps}: screenshot ${fname}`);
            const shotPath = path.join(workerDir, fname);
            await page.screenshot({ path: shotPath });
            console.log(`Screenshot saved: ${shotPath}`);
            break;
          }
          default:
            executedSteps++;
            console.log(`Executing step ${executedSteps}: ${step.action}`);
        }
        success = true;
        break;
      } catch (err) {
        console.error(`Error on scenario step ${scenarioStepCounter} attempt ${attempt}/${maxRetries}:`, err);
        if (attempt < maxRetries) {
          console.log(`Retrying scenario step ${scenarioStepCounter}...`);
          await page.waitForTimeout(1000);
        }
      }
    }
    if (!success) {
      console.error(`Scenario step ${scenarioStepCounter} failed after ${maxRetries} attempts; aborting run.`);
      break;
    }
  }
  // Signal completion and flush HAR
  console.log('Completed');
  console.log(`HAR saved: ${harPath}`);
  // Close context to ensure HAR is written
  await context.close();
  await browser.close();
  // Optionally filter HAR entries by whitelist patterns
  if (settings.harUrlWhitelist && Array.isArray(settings.harUrlWhitelist) && settings.harUrlWhitelist.length > 0) {
    try {
      const harContent = fs.readFileSync(harPath, 'utf8');
      const harJson = JSON.parse(harContent);
      const entries = harJson.log.entries || [];
      const originalCount = entries.length;
      const filtered = entries.filter(entry => {
        const url = entry.request.url;
        return settings.harUrlWhitelist.some(pattern => url.includes(pattern));
      });
      harJson.log.entries = filtered;
      fs.writeFileSync(harPath, JSON.stringify(harJson, null, 2), 'utf8');
      console.log(`Filtered HAR entries: kept ${filtered.length} of ${originalCount}`);
    } catch (err) {
      console.error('Error filtering HAR:', err);
    }
  }
  // Evaluate rules and dimensions against HAR
  try {
    const ruleEngine = require(path.join(__dirname, 'lib', 'ruleEngine'));
    const rulesDir = path.join(__dirname, 'rules');
    const dimsDir = path.join(__dirname, 'dimensions');
    let rules = [];
    let dimensions = [];
    if (fs.existsSync(rulesDir)) {
      for (const f of fs.readdirSync(rulesDir)) {
        const content = fs.readFileSync(path.join(rulesDir, f), 'utf8');
        rules.push(f.endsWith('.json') ? JSON.parse(content) : require('js-yaml').load(content));
      }
    }
    if (fs.existsSync(dimsDir)) {
      for (const f of fs.readdirSync(dimsDir)) {
        const content = fs.readFileSync(path.join(dimsDir, f), 'utf8');
        dimensions.push(f.endsWith('.json') ? JSON.parse(content) : require('js-yaml').load(content));
      }
    }
    const harJson = JSON.parse(fs.readFileSync(harPath, 'utf8'));
    const results = ruleEngine.evaluate(harJson, rules, dimensions);
    const resultsPath = path.join(workerDir, 'ruleResults.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Rule results written to: ${resultsPath}`);
    // Send rule results back to parent process if IPC channel is available
    if (process.send) {
      process.send({ type: 'ruleResults', results });
    }
  } catch (e) {
    console.error('Error evaluating rules:', e);
  }
}

const scenarioFile = process.argv[2];
if (!scenarioFile) {
  console.error('No scenario file specified');
  process.exit(1);
}
runScenario(scenarioFile).catch(err => {
  console.error(err);
  process.exit(1);
});