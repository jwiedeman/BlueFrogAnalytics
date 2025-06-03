document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('seo-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('seo-url').value;
    const results = document.getElementById('seo-results');
    results.textContent = `Running SEO test for ${url}...`;
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
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
        results.textContent = data.error || 'SEO test failed.';
        return;
      }
      const summary = {
        mobileScore: data.mobile ? Math.round(data.mobile.categories.seo.score * 100) : null,
        desktopScore: data.desktop ? Math.round(data.desktop.categories.seo.score * 100) : null
      };
      results.textContent = JSON.stringify(summary, null, 2);
    } catch (err) {
      console.error(err);
      results.textContent = 'Error running SEO test.';
    }
  });
});
