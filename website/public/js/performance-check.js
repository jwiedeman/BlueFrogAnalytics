document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('perf-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('perf-url').value;
    const results = document.getElementById('perf-results');
    results.textContent = `Running performance test for ${url}...`;
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
        return;
      }
      const metrics = [
        ['Performance Score', Math.round((data.categories.performance.score || 0) * 100)],
        ['First Contentful Paint', data.audits['first-contentful-paint'].displayValue],
        ['Speed Index', data.audits['speed-index'].displayValue],
        ['Largest Contentful Paint', data.audits['largest-contentful-paint'].displayValue],
        ['Time To Interactive', data.audits.interactive.displayValue],
        ['Total Blocking Time', data.audits['total-blocking-time'].displayValue],
        ['Cumulative Layout Shift', data.audits['cumulative-layout-shift'].displayValue]
      ];
      let html = '<table class="table table-dark table-striped"><tbody>';
      for (const [label, value] of metrics) {
        html += `<tr><th>${label}</th><td>${value}</td></tr>`;
      }
      html += '</tbody></table>';
      results.innerHTML = html;
    } catch (err) {
      console.error(err);
      results.textContent = 'Error running performance test.';
    }
  });
});
