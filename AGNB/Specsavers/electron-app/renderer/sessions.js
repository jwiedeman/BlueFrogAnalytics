// Sessions panel functionality
/**
 * Reload and render recorded sessions.
 */
export async function reloadSessions() {
  try {
    const sessions = await window.api.getSessions();
    console.log('reloadSessions:', sessions);
    const listEl = document.getElementById('sessionsList');
    listEl.innerHTML = '';
    if (!sessions || sessions.length === 0) {
      listEl.innerHTML = '<li class="list-group-item">No sessions recorded yet.</li>';
    } else {
      sessions.forEach(sess => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        li.textContent = `${sess.id} (${new Date(sess.timestamp).toLocaleString()})`;
        const btnGroup = document.createElement('div');
        // JSON export button
        const btnExportJson = document.createElement('button');
        btnExportJson.className = 'btn btn-sm btn-outline-primary mr-2';
        btnExportJson.textContent = 'Export JSON';
        btnExportJson.onclick = async () => {
          const data = await window.api.exportSession(sess.id);
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `session_${sess.id}.json`;
          a.click();
        };
        btnGroup.appendChild(btnExportJson);
        // HAR export button
        const btnExportHar = document.createElement('button');
        btnExportHar.className = 'btn btn-sm btn-outline-primary mr-2';
        btnExportHar.textContent = 'Export HAR';
        btnExportHar.onclick = async () => {
          const sessObj = await window.api.exportSession(sess.id);
          // Build minimal HAR
          const har = {
            log: {
              version: '1.2',
              creator: { name: 'QA Proxy', version: '1.0' },
              entries: []
            }
          };
          (sessObj.flows || []).forEach(flow => {
            const req = flow.request;
            const query = req.query && Object.keys(req.query).length
              ? '?' + new URLSearchParams(req.query).toString()
              : '';
            const fullUrl = `http://${req.host}${req.path}${query}`;
            const entry = {
              startedDateTime: sessObj.timestamp,
              time: 0,
              request: {
                method: req.method,
                url: fullUrl,
                httpVersion: 'HTTP/1.1',
                headers: Object.entries(req.headers || {}).map(([name, value]) => ({ name, value })),
                queryString: Object.entries(req.query || {}).map(([name, value]) => ({ name, value })),
                cookies: [],
                headersSize: -1,
                bodySize: req.body ? req.body.length : 0
              },
              response: {
                status: 0,
                statusText: '',
                httpVersion: '',
                headers: [],
                cookies: [],
                content: { size: 0, mimeType: '' },
                redirectURL: '',
                headersSize: -1,
                bodySize: 0
              },
              cache: {},
              timings: { send: 0, wait: 0, receive: 0 }
            };
            har.log.entries.push(entry);
          });
          const blob = new Blob([JSON.stringify(har, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `session_${sess.id}.har`;
          a.click();
        };
        btnGroup.appendChild(btnExportHar);
        const btnProcess = document.createElement('button');
        btnProcess.className = 'btn btn-sm btn-outline-secondary';
        btnProcess.textContent = 'Process';
        btnProcess.onclick = async () => {
          const processed = await window.api.processSession(sess.id);
          window.openProcessedSession(processed);
        };
        btnGroup.appendChild(btnProcess);
        li.appendChild(btnGroup);
        listEl.appendChild(li);
      });
    }
  } catch (e) {
    console.error('Failed to load sessions', e);
  }
}
/**
 * Initialize sessions panel controls and expose reloadSessions/openProcessedSession globally.
 */
export function initSessions() {
  window.reloadSessions = reloadSessions;
  // Auto-load sessions on startup
  reloadSessions();
  const reloadBtn = document.getElementById('reloadSessions');
  if (reloadBtn) reloadBtn.onclick = () => reloadSessions();
  const importBtn = document.getElementById('importSessionBtn');
  if (importBtn) importBtn.onclick = () => document.getElementById('importSessionFile').click();
  const importFile = document.getElementById('importSessionFile');
  if (importFile) {
    importFile.onchange = async () => {
      const file = importFile.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const obj = JSON.parse(text);
        const meta = await window.api.importSession(obj);
        if (meta) reloadSessions();
      } catch (e) {
        console.error('Invalid session JSON', e);
      }
    };
  }
  window.openProcessedSession = async results => {
    // Switch to Processed Hits panel
    document.querySelectorAll('#sidebar .nav-link').forEach(l => l.classList.remove('active'));
    const link = document.querySelector('#sidebar .nav-link[data-panel="processed-hits"]');
    if (link) link.classList.add('active');
    document.querySelectorAll('[id^="panel-"]').forEach(el => el.style.display = 'none');
    const panel = document.getElementById('panel-processed-hits');
    if (panel) panel.style.display = '';
    // Fetch dimensions and rules, then render items
    const dimsDefs = await window.api.getDimensions();
    const rulesDefs = await window.api.getRules();
    window.showProcessedItems(results, dimsDefs, rulesDefs);
  };
}
window.addEventListener('DOMContentLoaded', initSessions);