const path = require('path');
const { chromium, firefox, webkit } = require('playwright');
const logger = require('./utils/logger');

async function runFlow(steps, options) {
  const browserType = { chromium, firefox, webkit }[options.browser];
  if (!browserType) {
    throw new Error(`Unsupported browser: ${options.browser}`);
  }

  logger.info({ browser: options.browser, har: options.harPath }, 'Launching browser');
  const browser = await browserType.launch({ headless: true });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    recordHar: { path: options.harPath }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(options.timeout);
  page.setDefaultNavigationTimeout(options.timeout);

  const requests = [];
  page.on('request', req => requests.push(req.url()));

  logger.info('Starting flow execution');
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const [[action, param]] = Object.entries(step);
    logger.info({ step: i + 1, action, param }, 'Executing step');

    switch (action) {
      case 'goto':
        await page.goto(param);
        break;
      case 'click':
        await page.click(param);
        break;
      case 'type':
        await page.fill(param.selector, param.text);
        break;
      case 'wait':
        await page.waitForTimeout(param * 1000);
        break;
      case 'wait_for_selector':
        await page.waitForSelector(param);
        break;
      case 'assert_request':
        if (!requests.some(u => u.includes(param))) {
          throw new Error(`Assertion failed: no request matching "${param}"`);
        }
        break;
      case 'screenshot':
        // Save screenshot into outputDir
        const screenshotPath = path.resolve(options.outputDir, param);
        await page.screenshot({ path: screenshotPath });
        logger.info({ screenshotPath }, 'Screenshot saved');
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  // Wait up to 5s for networkidle to flush any in-flight requests
  try {
    logger.info('Waiting up to 5s for networkidle...');
    await page.waitForLoadState('networkidle', { timeout: 5000 });
    logger.info('Network idle reached.');
  } catch {
    logger.warn('Network idle not reached within timeout; proceeding.');
  }

  // Explicitly close the page
  try {
    await page.close();
    logger.info('Page closed.');
  } catch (e) {
    logger.warn({ err: e }, 'Error closing page; continuing.');
  }

  logger.info('Closing context (flushing HAR)...');
  await context.close();

  logger.info('Closing browser...');
  await browser.close();

  logger.info({ har: options.harPath }, 'HAR file generated successfully');
}

module.exports = { runFlow };