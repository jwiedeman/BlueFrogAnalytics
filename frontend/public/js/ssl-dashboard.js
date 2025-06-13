import { logTestStatus } from './test-status.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('ssl-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const domain = document.getElementById('ssl-domain').value.trim();
    const url = document.getElementById('ssl-url').value.trim();
    const results = document.getElementById('ssl-results');
    results.textContent = 'Fetching SSL info...';
    logTestStatus('ssl-dashboard', 'started');
    try {
      const user = window.firebaseAuth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const data = {};
      if (domain) {
        const res = await fetch(`${API_BASE}/api/domain-info?domain=${encodeURIComponent(domain)}`, { headers });
        data.domain = res.ok ? await res.json() : {};
      }
      if (url) {
        const res = await fetch(`${API_BASE}/api/page-metrics?url=${encodeURIComponent(url)}`, { headers });
        data.page = res.ok ? await res.json() : {};
      }
      let html = '';
      if (data.domain && data.domain.ssl_issuer) {
        html += `<h3>Domain Certificate Issuer</h3><p>${data.domain.ssl_issuer}</p>`;
      }
      if (data.page && data.page.ssl_issuer) {
        html += `<h3>Page Certificate Issuer</h3><p>${data.page.ssl_issuer}</p>`;
      }
      if (!html) html = '<p>No SSL details found.</p>';
      results.innerHTML = html;
      logTestStatus('ssl-dashboard', 'complete');
    } catch (err) {
      console.error(err);
      results.textContent = err.message || 'Error fetching SSL info.';
      logTestStatus('ssl-dashboard', 'error');
    }
  });
});
