document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('sitemap-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('sitemap-url').value;
    const results = document.getElementById('sitemap-results');
    results.textContent = `Fetching sitemap for ${url}...`;
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/tools/sitemap-xml?url=${encodeURIComponent(url)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const text = await res.text();
      if (!res.ok) {
        results.textContent = text;
        return;
      }
      results.textContent = '';
      const pre = document.createElement('pre');
      pre.className = 'bg-body-tertiary p-3 rounded';
      pre.textContent = text;
      results.appendChild(pre);
      const link = document.createElement('a');
      link.href = 'data:application/xml,' + encodeURIComponent(text);
      link.download = 'sitemap.xml';
      link.textContent = 'Download sitemap.xml';
      results.appendChild(document.createElement('br'));
      results.appendChild(link);
    } catch (err) {
      console.error(err);
      results.textContent = 'Error fetching sitemap.';
    }
  });
});
