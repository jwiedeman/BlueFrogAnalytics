document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
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
      const grams = data.co2;
      const miles = grams / 404; // ~404g CO2 per mile driven
      const bulbMinutes = (grams / 27) * 60; // 60W bulb ~27g CO2/hour
      results.innerHTML =
        `<p>Bytes transferred: <strong>${data.bytes.toLocaleString()}</strong></p>` +
        '<p>Emission factor: 0.5 µg CO₂ per byte</p>' +
        `<p>Estimated CO₂: <strong>${grams.toFixed(6)} g</strong></p>` +
        `<p>Equivalent to driving <strong>${miles.toFixed(4)} miles</strong> or ` +
        `powering a 60W bulb for <strong>${bulbMinutes.toFixed(2)} minutes</strong>.</p>`;
    } catch (err) {
      console.error(err);
      results.textContent = 'Error running calculation.';
    }
  });
});
