import { logTestStatus } from './test-status.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('security-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('security-url').value;
    const results = document.getElementById('security-results');
    results.textContent = `Checking security headers for ${url}...`;
    logTestStatus('security-headers', 'started');
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/tools/security-headers?url=${encodeURIComponent(url)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        results.textContent = data.error || 'Request failed';
        logTestStatus('security-headers', 'failed');
        return;
      }
      const recommended = {
        'content-security-policy': 'Define a restrictive CSP',
        'strict-transport-security': 'max-age=31536000; includeSubDomains',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'referrer-policy': 'no-referrer-when-downgrade',
        'permissions-policy': 'Disable unnecessary features',
        'cross-origin-resource-policy': 'same-origin',
        'cross-origin-opener-policy': 'same-origin',
        'cross-origin-embedder-policy': 'require-corp',
        'x-permitted-cross-domain-policies': 'none',
        'expect-ct': 'max-age=86400, enforce'
      };
      const rows = Object.keys(recommended).map(h => {
        const val = data.headers[h] || '';
        const ok = val && (h !== 'strict-transport-security' || /max-age/i.test(val));
        const status = ok ? '✔' : '✖';
        return `<tr class="${ok ? 'table-success' : 'table-danger'}"><td>${h}</td><td>${val || '-'}</td><td>${status}</td><td>${recommended[h]}</td></tr>`;
      }).join('');
      results.innerHTML = `<table class="table table-sm table-bordered"><thead><tr><th>Header</th><th>Value</th><th></th><th>Recommendation</th></tr></thead><tbody>${rows}</tbody></table>`;
      logTestStatus('security-headers', 'complete');
    } catch (err) {
      console.error(err);
      logTestStatus('security-headers', 'error');
      results.textContent = 'Error fetching headers.';
    }
  });
});
