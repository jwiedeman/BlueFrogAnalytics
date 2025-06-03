import { logTestStatus } from './test-status.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('seo-dashboard-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('seo-dashboard-url').value;
    const results = document.getElementById('seo-dashboard-results');
    results.textContent = `Running SEO audit for ${url}...`;
    logTestStatus('seo-audit', 'started');
    try {
      const user = window.firebaseAuth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
    const res = await fetch(`${API_BASE}/api/seo-audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) {
        logTestStatus('seo-audit', 'failed');
        throw new Error(data.error || 'Audit failed');
      }

      const render = (lhr, label) => {
        let html = `<h2>${label} Score: ${Math.round(lhr.categories.seo.score * 100)}</h2>`;
        html += '<ul class="list-group mb-3">';
        lhr.categories.seo.auditRefs.forEach(ref => {
          const audit = lhr.audits[ref.id];
          if (!audit) return;
          const score = audit.score === null ? 'N/A' : Math.round(audit.score * 100);
          const badge = audit.score === 1 ? 'success' : audit.score === 0 ? 'danger' : 'secondary';
          html += `<li class="list-group-item d-flex justify-content-between align-items-center">${audit.title}<span class="badge bg-${badge}">${score}</span></li>`;
        });
        html += '</ul>';
        return html;
      };

      let html = '';
      if (data.mobile) html += render(data.mobile, 'Mobile');
      if (data.desktop) html += render(data.desktop, 'Desktop');
      results.innerHTML = html;
      logTestStatus('seo-audit', 'complete');
    } catch (err) {
      results.textContent = err.message;
      logTestStatus('seo-audit', 'error');
    }
  });
});
