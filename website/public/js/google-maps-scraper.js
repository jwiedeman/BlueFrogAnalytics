const form = document.getElementById('gmaps-form');
const output = document.getElementById('gmaps-output');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  output.textContent = 'Starting...';
  const query = document.getElementById('gmaps-query').value;
  const total = Number(document.getElementById('gmaps-total').value);
  try {
    const res = await fetch('https://www.api.bluefroganalytics.com:6001/api/google-maps-scraper', {
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
