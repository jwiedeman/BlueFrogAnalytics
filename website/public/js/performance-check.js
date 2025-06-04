import { logTestStatus } from './test-status.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('perf-form');
  if (!form) return;

  const thresholds = {
    score: { good: 90, ok: 50 },
    fcp: { good: 1800, ok: 3000 },
    speed: { good: 3400, ok: 5800 },
    lcp: { good: 2500, ok: 4000 },
    tti: { good: 3800, ok: 7300 },
    tbt: { good: 200, ok: 600 },
    cls: { good: 0.1, ok: 0.25 }
  };

  const getRating = (type, value, higherIsBetter = false) => {
    const { good, ok } = thresholds[type];
    if (higherIsBetter) {
      if (value >= good) return 'text-success';
      if (value >= ok) return 'text-warning';
      return 'text-danger';
    }
    if (value <= good) return 'text-success';
    if (value <= ok) return 'text-warning';
    return 'text-danger';
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('perf-url').value;
    const results = document.getElementById('perf-results');
    results.textContent = `Running performance test for ${url}...`;
    logTestStatus('performance', 'started');
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/performance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) {
        results.textContent = data.error || 'Performance test failed.';
        logTestStatus('performance', 'failed');
        return;
      }
      const buildTable = lhr => {
        const isDark = document.documentElement.classList.contains('dark-mode');
        const metrics = [
          {
            label: 'Performance Score',
            value: Math.round((lhr.categories.performance.score || 0) * 100),
            type: 'score',
            numeric: Math.round((lhr.categories.performance.score || 0) * 100)
          },
          {
            label: 'First Contentful Paint',
            value: lhr.audits['first-contentful-paint'].displayValue,
            type: 'fcp',
            numeric: lhr.audits['first-contentful-paint'].numericValue
          },
          {
            label: 'Speed Index',
            value: lhr.audits['speed-index'].displayValue,
            type: 'speed',
            numeric: lhr.audits['speed-index'].numericValue
          },
          {
            label: 'Largest Contentful Paint',
            value: lhr.audits['largest-contentful-paint'].displayValue,
            type: 'lcp',
            numeric: lhr.audits['largest-contentful-paint'].numericValue
          },
          {
            label: 'Time To Interactive',
            value: lhr.audits.interactive.displayValue,
            type: 'tti',
            numeric: lhr.audits.interactive.numericValue
          },
          {
            label: 'Total Blocking Time',
            value: lhr.audits['total-blocking-time'].displayValue,
            type: 'tbt',
            numeric: lhr.audits['total-blocking-time'].numericValue
          },
          {
            label: 'Cumulative Layout Shift',
            value: lhr.audits['cumulative-layout-shift'].displayValue,
            type: 'cls',
            numeric: lhr.audits['cumulative-layout-shift'].numericValue
          }
        ];
        let html = `<table class="table table-striped${isDark ? ' table-dark' : ''}"><tbody>`;
        for (const m of metrics) {
          const cls = getRating(m.type, m.numeric, m.type === 'score');
          html += `<tr><th>${m.label}</th><td class="${cls}">${m.value}</td></tr>`;
        }
        html += '</tbody></table>';
        return html;
      };
      let html = `<h3>Mobile</h3>${buildTable(data.mobile)}`;
      if (data.mobileSuggestions) {
        html += `<p class="mt-2"><strong>Top Fixes:</strong> ${
          data.mobileSuggestions.performance || ''
        }</p>`;
      }
      html += `<h3>Desktop</h3>${buildTable(data.desktop)}`;
      if (data.desktopSuggestions) {
        html += `<p class="mt-2"><strong>Top Fixes:</strong> ${
          data.desktopSuggestions.performance || ''
        }</p>`;
      }
      results.innerHTML = html;
      logTestStatus('performance', 'complete');
    } catch (err) {
      console.error(err);
      logTestStatus('performance', 'error');
      results.textContent = 'Error running performance test.';
    }
  });
});
