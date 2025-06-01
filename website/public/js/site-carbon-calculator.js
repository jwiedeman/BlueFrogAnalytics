document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('carbon-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('carbon-url').value;
    const results = document.getElementById('carbon-results');
    results.textContent = `Calculating carbon footprint for ${url}...`;
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch('https://www.api.bluefroganalytics.com:6001/api/tools/carbon', {
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
