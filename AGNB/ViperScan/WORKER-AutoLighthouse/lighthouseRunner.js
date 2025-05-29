/**
 * Run a Lighthouse audit against a URL on an existing Chrome instance.
 * @param {string} url
 * @param {number} port
 * @returns {object} Lighthouse LHR result
 */
async function runLighthouse(url, port, mode = 'desktop') {
  const { default: lighthouse } = await import('lighthouse');
  const options = { port, formFactor: mode, screenEmulation: {} };
  if (mode === 'desktop') {
    options.screenEmulation = {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false
    };
  } else {
    options.screenEmulation = {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      disabled: false
    };
  }
  const runnerResult = await lighthouse(url, options);
  return runnerResult.lhr;
}

module.exports = { runLighthouse };