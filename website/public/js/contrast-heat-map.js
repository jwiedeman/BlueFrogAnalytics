document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com';
  const form = document.getElementById('contrast-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('contrast-url').value;
    const results = document.getElementById('contrast-results');
    results.textContent = `Generating contrast heat-map for ${url}...`;
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/tools/contrast-heatmap`, {
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
      const img = new Image();
      img.src = 'data:image/png;base64,' + data.image;
      results.textContent = '';
      results.appendChild(img);
    } catch (err) {
      console.error(err);
      results.textContent = 'Error generating heat map.';
    }
  });
});
