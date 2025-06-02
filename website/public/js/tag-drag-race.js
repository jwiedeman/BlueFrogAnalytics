document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('drag-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('drag-url').value;
    const results = document.getElementById('drag-results');
    results.textContent = `Running Tag Drag Race for ${url}...`;
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/tools/tag-drag-race`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) {
        results.textContent = data.error || 'Request failed.';
        return;
      }
      const rows = data.scripts
        .map(s => `<tr><td>${s.src}</td><td>${s.bytes || '-'}</td><td>${s.ms || '-'}<\/td></tr>`)
        .join('');
      results.innerHTML = `<table class="table table-sm table-bordered"><thead><tr><th>Script</th><th>Bytes</th><th>ms</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (err) {
      console.error(err);
      results.textContent = 'Error running analysis.';
    }
  });
});
