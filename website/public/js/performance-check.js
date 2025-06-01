document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('perf-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('perf-url').value;
    const results = document.getElementById('perf-results');
    results.textContent = `Running performance test for ${url}...`;
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch('https://www.api.bluefroganalytics.com/api/performance', {
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
      results.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      console.error(err);
      results.textContent = 'Error running performance test.';
    }
  });
});
