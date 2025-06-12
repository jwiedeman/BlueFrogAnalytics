import { logTestStatus } from './test-status.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('serp-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('serp-url').value;
    const results = document.getElementById('serp-results');
    results.textContent = `Generating SERP preview for ${url}...`;
    logTestStatus('serp-preview', 'started');
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch(
        `${API_BASE}/api/tools/serp-preview?url=${encodeURIComponent(url)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) {
        results.textContent = data.error || 'Request failed.';
        logTestStatus('serp-preview', 'failed');
        return;
      }
      const titleLen = data.title.length;
      const descLen = data.description.length;
      const base = 0.1;
      const titleScore = 0.4 * Math.min(titleLen, 60) / 60;
      const descScore = 0.5 * Math.min(descLen, 160) / 160;
      const ctr = base + titleScore + descScore;
      results.innerHTML = `
        <div class="serp-preview border rounded p-3 mb-3">
          <div class="serp-url mb-1">${url}</div>
          <div class="serp-title mb-1">${data.title}</div>
          <div class="serp-description">${data.description}</div>
        </div>
        <p><strong>Predicted CTR: ${(ctr * 100).toFixed(1)}%</strong></p>
        <ul class="ctr-breakdown list-unstyled">
          <li>Base score: ${(base * 100).toFixed(0)}%</li>
          <li>Title length (${titleLen}/60): ${(titleScore * 100).toFixed(0)}%</li>
          <li>Description length (${descLen}/160): ${(descScore * 100).toFixed(0)}%</li>
        </ul>`;
      logTestStatus('serp-preview', 'complete');
    } catch (err) {
      console.error(err);
      logTestStatus('serp-preview', 'error');
      results.textContent = 'Error generating preview.';
    }
  });
});
