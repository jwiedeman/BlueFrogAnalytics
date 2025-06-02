const form = document.getElementById('gmaps-form');
const output = document.getElementById('gmaps-output');
const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  output.textContent = 'Starting...';
  const query = document.getElementById('gmaps-query').value;
  const total = Number(document.getElementById('gmaps-total').value);
  try {
    const res = await fetch(`${API_BASE}/api/google-maps-scraper`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, total })
    });
    const data = await res.json();
    if (res.ok) {
      output.innerHTML = `<p>Worker started. CSV will be saved to <code>${data.file}</code></p>`;
    } else {
      output.textContent = data.error || 'Failed to start worker';
    }
  } catch (err) {
    output.textContent = err.message;
  }
});
