import { logTestStatus } from './test-status.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('a11y-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('a11y-url').value;
    const results = document.getElementById('a11y-results');
    results.textContent = `Running accessibility test for ${url}...`;
    logTestStatus('accessibility', 'started');
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/audit/accessibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) {
        results.textContent = data.error || 'Audit failed.';
        logTestStatus('accessibility', 'failed');
        return;
      }
      results.textContent = JSON.stringify(data, null, 2);
      logTestStatus('accessibility', 'complete');
    } catch (err) {
      console.error(err);
      logTestStatus('accessibility', 'error');
      results.textContent = 'Error running accessibility audit.';
    }
  });
});

