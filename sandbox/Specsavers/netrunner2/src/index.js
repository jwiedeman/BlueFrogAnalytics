#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { URL } = require('url');
const playwright = require('playwright');
const { spawn, spawnSync, execSync } = require('child_process');
const net = require('net');

(async () => {
  const program = new Command();
  program
    .name('flow-runner')
    .description('Run DSL flows with Playwright and record a HAR via mitmproxy')
    .version('0.1.0');

  program.command('run <flow>')
    .description('Run a flow YAML file')
    .option('-b, --browser <browser>', 'Browser to use (chromium|firefox|webkit)', 'chromium')
    .option('-o, --output <dir>', 'Output directory for artifacts', 'output')
    .option('-d, --debug', 'Enable debug logging', false)
    .action(async (flow, options) => {
      // Load and validate flow YAML
      const flowPath = path.resolve(flow);
      if (!fs.existsSync(flowPath)) {
        console.error(`Flow file not found: ${flowPath}`);
        process.exit(1);
      }
      let flowData;
      try {
        flowData = yaml.load(fs.readFileSync(flowPath, 'utf8'));
      } catch (err) {
        console.error(`Failed to parse YAML: ${err}`);
        process.exit(1);
      }
      if (!Array.isArray(flowData)) {
        console.error('Flow YAML must be an array of steps');
        process.exit(1);
      }

      // Prepare output directory
      const flowName = path.basename(flowPath, path.extname(flowPath));
      const gotoStep = flowData.find(s => s.goto && typeof s.goto === 'string');
      const domain = gotoStep ? new URL(gotoStep.goto).hostname : 'unknown';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputDir = path.join(options.output, domain, flowName, timestamp);
      fs.mkdirSync(outputDir, { recursive: true });

      // Determine path for HAR
      const harPath = path.join(outputDir, 'flows.har');
      const absoluteHarPath = path.resolve(harPath);
      console.log(`Recording HAR to: ${absoluteHarPath}`);
      
      // Locate mitmproxy SaveHar addon via Python
      let saveharPath;
      try {
        const res = spawnSync('python3', [
          '-c', 'import mitmproxy.addons.savehar; print(mitmproxy.addons.savehar.__file__)'
        ], { encoding: 'utf-8' });
        if (res.status !== 0 || !res.stdout) {
          throw new Error(res.stderr || 'Cannot find mitmproxy SaveHar addon');
        }
        saveharPath = res.stdout.trim();
        console.log(`Using mitmproxy SaveHar addon: ${saveharPath}`);
      } catch (err) {
        console.error(`Error locating SaveHar addon: ${err}`);
        process.exit(1);
      }
      
      // Find an available port
      const findAvailablePort = (startPort) => {
        return new Promise((resolve, reject) => {
          const server = net.createServer();
          server.unref();
          server.on('error', reject);
          server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => {
              resolve(port);
            });
          });
        });
      };

      // Check for existing mitmproxy instances
      console.log('Checking for existing mitmproxy instances...');
      try {
        const processes = execSync('ps aux | grep mitmdump | grep -v grep', { encoding: 'utf8' });
        if (processes) {
          console.log('Found existing mitmproxy instances:');
          console.log(processes);
          console.log('Attempting to kill existing instances...');
          try {
            execSync('pkill -f mitmdump');
            console.log('Killed existing mitmproxy instances');
            // Wait for ports to be released
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (e) {
            console.error('Failed to kill existing mitmproxy instances, will try a different port');
          }
        }
      } catch (e) {
        // No existing instances found
        console.log('No existing mitmproxy instances found');
      }
      
      // Find available port starting from 8081 (to avoid using 8080 if it's busy)
      let proxyPort;
      try {
        proxyPort = await findAvailablePort(8081);
        console.log(`Using port ${proxyPort} for mitmproxy`);
      } catch (err) {
        console.error(`Error finding available port: ${err}`);
        proxyPort = 8082; // Fallback
        console.log(`Falling back to port ${proxyPort}`);
      }

      // Start mitmdump with HAR export - with proper stdio options
      console.log('Starting mitmproxy...');
      const mitm = spawn('mitmdump', [
        '-s', saveharPath,
        options.debug ? '' : '--quiet',
        '--set', `hardump=${absoluteHarPath}`,
        '--mode', `regular@${proxyPort}`
      ].filter(Boolean), { 
        stdio: options.debug ? 'inherit' : 'pipe' 
      });

      // Log mitmproxy events
      if (!options.debug) {
        mitm.stdout?.on('data', data => console.log(`[mitm] ${data.toString().trim()}`));
        mitm.stderr?.on('data', data => console.error(`[mitm] ${data.toString().trim()}`));
      }
      
      mitm.on('exit', code => {
        console.log(`Mitmproxy exited with code ${code}`);
        if (fs.existsSync(harPath)) {
          console.log(`HAR file saved successfully: ${harPath}`);
          const stats = fs.statSync(harPath);
          console.log(`HAR file size: ${stats.size} bytes`);
        } else {
          console.error(`HAR file not created at ${harPath}`);
        }
      });

      // Give mitmproxy time to start
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Launch persistent browser context via mitm proxy
      console.log(`Launching persistent browser context: ${options.browser}`);
      const userDataDir = path.join(outputDir, 'user-data');
      fs.mkdirSync(userDataDir, { recursive: true });
      
      let context;
      try {
        context = await playwright[options.browser].launchPersistentContext(userDataDir, {
          headless: true,
          proxy: { server: `http://127.0.0.1:${proxyPort}` },
          ignoreHTTPSErrors: true
        });
      } catch (err) {
        if (err.message.includes('EPERM') && err.message.includes('mkdtemp')) {
          console.error('Playwright persistentContext error: cannot create temp directory (mkdtemp EPERM)');
          console.error('Please fix permissions of the system temp directory, e.g.:');
          console.error('  sudo chown -R $(id -u):$(id -g) /var/folders');
          process.exit(1);
        }
        throw err;
      }
      
      const page = context.pages()[0] || await context.newPage();
      console.log('Page created, beginning flow execution');
      
      // Increase timeouts
      page.setDefaultNavigationTimeout(240000);
      page.setDefaultTimeout(240000);

      // Capture requests for assertions and debugging
      const requests = [];
      if (options.debug) {
        page.on('request', req => {
          console.log(`> ${req.method()} ${req.url()}`);
          requests.push(req.url());
        });
      } else {
        page.on('request', req => requests.push(req.url()));
      }

      try {
        console.log('Executing flow steps');
        for (let i = 0; i < flowData.length; i++) {
          const [action, param] = Object.entries(flowData[i])[0];
          console.log(`Step ${i + 1}: ${action}`);
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
                console.error(`Assertion failed: no request matching "${param}"`);
                process.exit(1);
              }
              break;
            case 'screenshot':
              await page.screenshot({ path: path.join(outputDir, param) });
              break;
            default:
              console.error(`Unknown action: ${action}`);
              process.exit(1);
          }
        }
        console.log('Flow completed successfully');
      } catch (err) {
        console.error(`Error during flow execution: ${err}`);
        process.exit(1);
      } finally {
        console.log('Closing browser and saving HAR...');
        // Close persistent context (flush HAR and close browser)
        try { 
          await context.close(); 
          console.log('Browser context closed');
        } catch (e) {
          console.error(`Error closing browser context: ${e}`);
        }
        
        // Allow time for browser to fully close
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check if mitmproxy is still running
        if (mitm.killed) {
          console.log('Mitmproxy was already terminated');
        } else {
          // Stop mitmproxy to flush HAR and wait for exit (or timeout)
          console.log('Stopping mitmproxy...');
          try { 
            // Send SIGUSR1 signal to tell mitmproxy to write HAR file now
            if (process.platform === 'darwin' || process.platform === 'linux') {
              execSync(`kill -USR1 ${mitm.pid}`);
              console.log('Sent SIGUSR1 to mitmproxy to trigger HAR dump');
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Then send normal termination signal
            mitm.kill('SIGINT'); 
          } catch (e) {
            console.error(`Error signaling mitmproxy: ${e}`);
          }
          
          // Wait longer for HAR to be flushed to disk
          const mitmdumpTimeout = 10000; // 10 seconds
          await Promise.race([
            new Promise(r => mitm.on('exit', r)),
            new Promise(r => setTimeout(() => {
              console.log(`Mitmproxy didn't exit after ${mitmdumpTimeout}ms, forcing kill...`);
              try { 
                mitm.kill('SIGKILL'); 
                // For good measure, try pkill as well 
                if (process.platform === 'darwin' || process.platform === 'linux') {
                  execSync('pkill -f mitmdump');
                }
              } catch {}
              r();
            }, mitmdumpTimeout))
          ]);
        }
        
        // Double-check if HAR was created
        console.log('Checking for HAR file...');
        if (fs.existsSync(harPath)) {
          console.log(`HAR file saved at: ${harPath}`);
          const stats = fs.statSync(harPath);
          console.log(`HAR file size: ${stats.size} bytes`);
        } else {
          console.error(`HAR file was not created at ${harPath}`);
          
          // Try manually creating HAR file using direct invocation as a fallback
          console.log('Attempting to create HAR file with direct mitmproxy invocation...');
          try {
            // Create a basic HAR structure
            const basicHar = {
              log: {
                version: '1.2',
                creator: {
                  name: 'flow-runner-fallback',
                  version: '0.1.0'
                },
                pages: [],
                entries: []
              }
            };
            
            // Write the basic HAR file
            fs.writeFileSync(harPath, JSON.stringify(basicHar, null, 2));
            console.log(`Created basic HAR file at: ${harPath}`);
            
            // Try to run mitmproxy directly with HAR output
            console.log('Attempting to run mitmproxy directly for HAR generation...');
            try {
              const dumpResult = spawnSync('mitmdump', [
                '-ns',
                saveharPath,
                '--set', `hardump=${absoluteHarPath}`,
                '--readfile', path.join(outputDir, 'traffic.flow') // Assuming flow file exists
              ], { 
                timeout: 15000,
                encoding: 'utf8'
              });
              
              if (dumpResult.error) {
                console.error(`Failed to run mitmproxy directly: ${dumpResult.error}`);
              } else {
                console.log('Direct mitmproxy invocation completed');
              }
            } catch (e) {
              console.error(`Error during direct mitmproxy invocation: ${e}`);
            }
          } catch (e) {
            console.error(`Failed in fallback HAR creation: ${e}`);
          }
        }
        
        console.log(`All artifacts written to: ${outputDir}`);
      }
    });

  await program.parseAsync(process.argv);
})();