// Renderer entrypoint: wire up UI modules and controls
import './common.js';
import './raw.js';
import './processed.js';
import './whitelist.js';
import './events.js';
import './sessions.js';
import './dimensions.js';
import './settings.js';

// Wait until elements are available
window.addEventListener('DOMContentLoaded', () => {
  // Proxy start/stop toggle
  const btnProxy = document.getElementById('toggleProxy');
  let proxyRunning = false;
  const statusIndicator = document.getElementById('statusIndicator');
  function updateIndicator() {
    if (!statusIndicator) return;
    statusIndicator.textContent = proxyRunning ? 'Running' : 'Stopped';
    statusIndicator.className = 'badge ' + (proxyRunning ? 'badge-success' : 'badge-secondary');
  }
  if (btnProxy) {
    btnProxy.addEventListener('click', async () => {
      if (!proxyRunning) {
        await window.api.startProxy();
        proxyRunning = true;
      } else {
        await window.api.stopProxy();
        proxyRunning = false;
      }
      btnProxy.textContent = proxyRunning ? 'Stop Proxy' : 'Start Proxy';
      btnProxy.classList.toggle('btn-outline-danger', proxyRunning);
      btnProxy.classList.toggle('btn-outline-primary', !proxyRunning);
      updateIndicator();
    });
    // Initialize state
    window.api.getStatus().then(status => {
      proxyRunning = status;
      btnProxy.textContent = proxyRunning ? 'Stop Proxy' : 'Start Proxy';
      btnProxy.classList.toggle('btn-outline-danger', proxyRunning);
      btnProxy.classList.toggle('btn-outline-primary', !proxyRunning);
      updateIndicator();
    });
  }
  // Recording toggle
  const btnRecord = document.getElementById('toggleRecording');
  let recording = false;
  if (btnRecord) {
    btnRecord.addEventListener('click', async () => {
      if (!recording) {
        await window.api.startSessionRecording();
        recording = true;
        btnRecord.textContent = 'Stop Recording';
      } else {
        await window.api.stopSessionRecording();
        recording = false;
        btnRecord.textContent = 'Start Recording';
      }
    });
  }
  // CA sync and regenerate
  const btnSyncCA = document.getElementById('syncCA');
  if (btnSyncCA) btnSyncCA.onclick = () => window.api.syncCA();
  const btnRegenCA = document.getElementById('regenerateCA');
  if (btnRegenCA) btnRegenCA.onclick = () => window.api.regenerateCA();
  // Navigation between panels
  document.querySelectorAll('#sidebar .nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      document.querySelectorAll('#sidebar .nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const panel = link.dataset.panel;
      ['proxy','whitelist','rules','raw','processed-hits','sessions','dimensions','settings','docs']
        .forEach(p => {
          const el = document.getElementById('panel-' + p);
          if (el) el.style.display = (p === panel ? '' : 'none');
        });
      // Load panel data as needed
      if (panel === 'whitelist') window.reloadWhitelist();
      if (panel === 'rules') window.reloadRules();
      if (panel === 'raw') window.reloadFlows();
      if (panel === 'processed-hits') window.reloadProcessed();
      if (panel === 'sessions') window.reloadSessions();
      if (panel === 'dimensions') window.reloadDimensions();
      if (panel === 'settings') window.initSettings && window.initSettings();
    });
  });
});