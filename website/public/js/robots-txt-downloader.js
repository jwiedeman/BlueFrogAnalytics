import { logTestStatus } from './test-status.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('robots-form');
  if (!form) return;

  const escapeHtml = str =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const url = document.getElementById('robots-url').value;
    const results = document.getElementById('robots-results');
    results.textContent = `Fetching robots.txt for ${url}...`;
    logTestStatus('robots-txt', 'started');

    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch(
        `${API_BASE}/api/tools/robots-txt?url=${encodeURIComponent(url)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const text = await res.text();
      if (!res.ok) {
        results.textContent = text;
        logTestStatus('robots-txt', 'failed');
        return;
      }

      results.innerHTML = `
        <p><strong>Status:</strong> ${res.status}</p>
        <p><strong>Size:</strong> ${text.length} bytes</p>
        <pre class="border rounded p-2 bg-light">${escapeHtml(text)}</pre>
      `;

      const link = document.createElement('a');
      link.href = 'data:text/plain,' + encodeURIComponent(text);
      link.download = 'robots.txt';
      link.className = 'btn btn-sm btn-secondary mt-2';
      link.textContent = 'Download robots.txt';
      results.appendChild(link);
      logTestStatus('robots-txt', 'complete');
    } catch (err) {
      console.error(err);
      logTestStatus('robots-txt', 'error');
      results.textContent = 'Error fetching robots.txt.';
    }
  });
});
