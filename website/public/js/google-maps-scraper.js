import { logTestStatus } from './test-status.js';

const form = document.getElementById('gmaps-form');
const output = document.getElementById('gmaps-output');
// Progress is shown within the worker page only. The site no longer
// includes the global status bar.
const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
let progressTimer;

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  output.textContent = 'Starting...';
  const query = document.getElementById('gmaps-query').value;
  const total = Number(document.getElementById('gmaps-total').value);
  logTestStatus('google-maps-scraper', 'started');
  try {
    const res = await fetch(`${API_BASE}/api/google-maps-scraper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, total })
    });
    const data = await res.json();
    if (res.ok) {
      output.innerHTML = `<p>Worker started. CSV will be saved to <code>${data.file}</code></p>`;
      const progressEl = document.createElement('div');
      progressEl.id = 'gmaps-progress';
      progressEl.textContent = `0 / ${total} found`;
      output.appendChild(progressEl);
      // Progress for the active scrape is only displayed in this page.
      clearInterval(progressTimer);
      progressTimer = setInterval(async () => {
        try {
          const statusRes = await fetch(`${API_BASE}/api/google-maps-scraper/progress?file=${encodeURIComponent(data.file)}`);
          const status = await statusRes.json();
          if (statusRes.ok) {
            const pct = Math.min(100, (status.count / total) * 100);
            progressEl.textContent = `${status.count} / ${total} found` + (status.last ? ` | Added: ${status.last}` : '');
            if (status.count >= total) clearInterval(progressTimer);
          }
        } catch (err) {
          console.warn('progress error', err);
        }
      }, 15000);
      logTestStatus('google-maps-scraper', 'complete');
    } else {
      output.textContent = data.error || 'Failed to start worker';
      logTestStatus('google-maps-scraper', 'failed');
    }
  } catch (err) {
    output.textContent = err.message;
    logTestStatus('google-maps-scraper', 'error');
  }
});
