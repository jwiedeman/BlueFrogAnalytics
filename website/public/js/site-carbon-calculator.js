document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com';
  const form = document.getElementById('carbon-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('carbon-url').value;
    const results = document.getElementById('carbon-results');
    results.textContent = `Calculating carbon footprint for ${url}...`;
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/tools/carbon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) {
        results.textContent = data.error || 'Calculation failed.';
        return;
      }
      results.textContent = `Bytes: ${data.bytes}\nEstimated gCO2: ${data.co2.toFixed(6)}`;
    } catch (err) {
      console.error(err);
      results.textContent = 'Error running calculation.';
    }
  });
});
