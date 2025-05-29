// src/proxyManager.js
import { spawn } from 'child_process';
import { log } from './utils/logger.js';

/**
 * Starts mitmdump and returns the child process instance.
 */
export function startMitmproxy({ port, saveHarPath, debug }) {
  const args = [
    '-s', 'mitmproxy.addons.savehar',
    '--quiet',
    '--set', `hardump=${saveHarPath}`,
    '--mode', `regular@${port}`
  ];
  log({ level: 'info', msg: `Starting mitmproxy on port ${port}` });
  const proc = spawn('mitmdump', args, { stdio: debug ? 'inherit' : 'pipe' });
  proc.stdout?.on('data', d => log({ msg: `[mitm] ${d}` }));
  proc.stderr?.on('data', d => log({ level: 'error', msg: `[mitm] ${d}` }));
  return proc;
}
