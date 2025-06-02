document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('security-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('security-url').value;
    const results = document.getElementById('security-results');
    results.textContent = `Checking security headers for ${url}...`;
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/tools/security-headers?url=${encodeURIComponent(url)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        results.textContent = data.error || 'Request failed';
        return;
      }
      results.textContent = JSON.stringify(data.headers, null, 2);
    } catch (err) {
      console.error(err);
      results.textContent = 'Error fetching headers.';
    }
  });
});
