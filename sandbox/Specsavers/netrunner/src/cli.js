const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const { loadFlow } = require('./flowLoader');
const { runFlow } = require('./runner');
const logger = require('./utils/logger');

(async () => {
  const program = new Command();
  program
    .name('flow-runner')
    .description('Run YAML-defined flows with Playwright')
    .version('1.0.0');

  program.command('run <flow>')
    .option('-b, --browser <browser>', 'Browser (chromium|firefox|webkit)', 'chromium')
    .option('-o, --output <dir>', 'Output directory', 'output')
    .option('-t, --timeout <ms>', 'Timeout in ms', parseInt, 120_000)
    .action(async (flow, opts) => {
      const flowSteps = loadFlow(flow);

      const flowName = path.basename(flow, path.extname(flow));
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputDir = path.join(opts.output, flowName, timestamp);
      fs.mkdirSync(outputDir, { recursive: true });

      // Absolute paths for HAR and screenshots
      const harPath = path.resolve(outputDir, `${flowName}.har`);

      try {
        await runFlow(flowSteps, {
          browser: opts.browser,
          timeout: opts.timeout,
          harPath,
          outputDir
        });
        logger.info({ harPath }, 'Flow run finished');
      } catch (err) {
        logger.error({ err }, 'Flow execution failed');
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
})();
