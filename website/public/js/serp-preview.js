document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('serp-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('serp-url').value;
    const results = document.getElementById('serp-results');
    results.textContent = `Generating SERP preview for ${url}...`;
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/tools/serp-preview?url=${encodeURIComponent(url)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        results.textContent = data.error || 'Request failed.';
        return;
      }
      results.textContent = `Title: ${data.title}\nDescription: ${data.description}\nCTR: ${data.predicted_ctr}`;
    } catch (err) {
      console.error(err);
      results.textContent = 'Error generating preview.';
    }
  });
});
