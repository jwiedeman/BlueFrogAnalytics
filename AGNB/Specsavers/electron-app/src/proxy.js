const Proxy = require('http-mitm-proxy');
const { EventEmitter } = require('events');
const url = require('url');
const querystring = require('querystring');
const RuleEngine = require('./ruleEngine');
const path = require('path');
const { exec } = require('child_process');

/**
 * QAProxy: HTTP/HTTPS MITM proxy for whitelisted domains.
 *
 * Intercepts TLS traffic for domains in the whitelist and applies QA rules.
 * Non-whitelisted domains are tunneled directly without inspection.
 *
 * Options:
 *  - sslCaDir: directory for storing the root CA and host certificates/keys.
 *  - httpAgent: custom HTTP agent (e.g., with extra CA certs).
 *  - httpsAgent: custom HTTPS agent for proxy-to-server connections.
 *
 * Certificate artifacts created under sslCaDir:
 *  - Root CA: certs/ca.pem, keys/ca.private.key
 *  - Host certs: certs/<hostname>.pem, keys/<hostname>.key
 *
 * To avoid TLS errors for MITM'd domains, import and trust
 * the root CA (sslCaDir/certs/ca.pem) in your OS/browser trust store.
 */
class QAProxy extends EventEmitter {
  /**
   * @param {string[]} whitelist - domains to intercept
   * @param {object[]} rules - rule definitions
   * @param {object} [options] - http-mitm-proxy options (e.g., sslCaDir)
   */
  constructor(whitelist = [], rules = [], options = {}) {
    super();
    this.whitelist = new Set(whitelist);
    this.engine = new RuleEngine(rules);
    // Store options (e.g., sslCaDir, custom agents) separately
    this.options = options;
    // Build options for http-mitm-proxy, including SSL CA directory and custom agents
    const proxyOpts = {};
    if (options.sslCaDir) {
      proxyOpts.sslCaDir = options.sslCaDir;
    }
    if (options.httpAgent) {
      proxyOpts.httpAgent = options.httpAgent;
    }
    if (options.httpsAgent) {
      proxyOpts.httpsAgent = options.httpsAgent;
    }
    // Initialize the MITM proxy with the assembled options
    this.proxy = Proxy(proxyOpts);
  }

  start(port = 8080) {
    this.proxy.onError((ctx, err) => {
      // Ignore broken pipe errors, log others
      if (err && err.code === 'EPIPE') return;
      console.error('Proxy error:', err);
    });
    // Only MITM traffic for whitelisted hosts; tunnel others unchanged
    const net = require('net');
    this.proxy.onConnect((req, socket, head, callback) => {
      // Catch socket errors (e.g. client disconnects) to prevent unhandled exceptions
      socket.on('error', err => {
        if (err.code !== 'EPIPE') console.error('Client socket error:', err);
      });
      // req.url is 'hostname:port'
      const [hostname, port] = req.url.split(':');
      if (!this.whitelist.has(hostname)) {
        // Bypass MITM: establish raw tunnel
        const srvSocket = net.connect(port || 443, hostname, () => {
          socket.write('HTTP/1.1 200 OK\r\n\r\n');
          if (head && head.length) srvSocket.write(head);
          srvSocket.pipe(socket);
          socket.pipe(srvSocket);
        });
        srvSocket.on('error', err => {
          if (err.code !== 'EPIPE') console.error('Server socket error:', err);
          socket.destroy();
        });
        return; // skip default MITM handling
      }
      // MITM for whitelisted host
      callback();
    });
    // Handle HTTP requests (and MITM-ed HTTPS for whitelisted hosts)
    this.proxy.onRequest(this.handleRequest.bind(this));
    // Listen with optional SSL CA directory for cert generation
    const listenOpts = { port };
    if (this.options && this.options.sslCaDir) {
      listenOpts.sslCaDir = this.options.sslCaDir;
    }
    this.proxy.listen(listenOpts, () => {
      console.log(`Proxy listening on port ${port}`);
      // On macOS, automatically add the root CA to the system keychain
      if (process.platform === 'darwin' && this.options.sslCaDir) {
        const caCert = path.join(this.options.sslCaDir, 'certs', 'ca.pem');
        console.log(`Adding root CA to macOS system keychain: ${caCert}`);
        exec(
          `security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain \"${caCert}\"`,
          (err, stdout, stderr) => {
            if (err) {
              console.error('Failed to add root CA to keychain:', stderr || err);
            } else {
              console.log('Root CA successfully added to system keychain');
            }
          }
        );
      }
    });
  }

  stop() {
    this.proxy.close();
    console.log('Proxy stopped');
  }

  handleRequest(ctx, callback) {
    const req = ctx.clientToProxyRequest;
    const parsed = url.parse(req.url, true);
    const hostHeader = req.headers.host || '';
    const host = hostHeader.split(':')[0];
    if (!this.whitelist.has(host)) {
      return callback();
    }
    const flow = {
      request: {
        method: req.method,
        host,
        path: parsed.pathname,
        query: parsed.query,
        headers: req.headers,
        body: null,
        json: null,
        form: null
      }
    };
    let chunks = [];
    ctx.onRequestData((ctx, chunk, done) => {
      chunks.push(chunk);
      done(null, chunk);
    });
    ctx.onRequestEnd((ctx, done) => {
      const buffer = Buffer.concat(chunks);
      const ct = req.headers['content-type'] || '';
      // Capture raw body for POST/PUT/PATCH
      flow.request.body = buffer.toString();
      // Parse structured content
      if (ct.includes('application/json')) {
        try { flow.request.json = JSON.parse(flow.request.body); } catch { flow.request.json = null; }
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        flow.request.form = querystring.parse(flow.request.body);
      }
      // Process flow against rules and emit processed hit
      const results = this.engine.process(flow);
      // Emit processed flow with evaluation results
      this.emit('processedFlow', { flow, results });
      // Emit raw flow for UI consumption
      this.emit('flow', flow);
      done();
    });
    return callback();
  }
}

module.exports = QAProxy;