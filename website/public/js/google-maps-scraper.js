const form = document.getElementById('gmaps-form');
const output = document.getElementById('gmaps-output');
const dash = document.getElementById('gmaps-dashboard');
const totalEl = document.querySelector('#gmaps-dashboard .total');
const rateEl = document.querySelector('#gmaps-dashboard .rate');
const tableBody = document.querySelector('#gmaps-dashboard tbody');

let dbPath = null;
let lastTotal = 0;
let lastTime = Date.now();

async function poll() {
  if (!dbPath) return;
  try {
    const res = await fetch(
      `https://www.api.bluefroganalytics.com/api/google-maps-progress?db=${encodeURIComponent(dbPath)}`
    );
    if (!res.ok) return;
    const data = await res.json();
    const now = Date.now();
    const diff = data.total - lastTotal;
    const rate = diff / ((now - lastTime) / 1000);
    lastTotal = data.total;
    lastTime = now;
    totalEl.textContent = data.total;
    rateEl.textContent = rate.toFixed(2);
    tableBody.innerHTML = data.latest
      .map((r) => `<tr><td>${r.name}</td><td>${r.address}</td></tr>`)
      .join('');
    dash.classList.remove('d-none');
  } catch {}
}

setInterval(poll, 200);

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  output.textContent = 'Starting...';
  const query = document.getElementById('gmaps-query').value;
  const total = Number(document.getElementById('gmaps-total').value);
  try {
    const res = await fetch('https://www.api.bluefroganalytics.com/api/google-maps-scraper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, total })
    });
    const data = await res.json();
    if (res.ok) {
      dbPath = data.file;
      lastTotal = 0;
      lastTime = Date.now();
      output.innerHTML = `<p>Worker started. Database <code>${data.file}</code></p>`;
    } else {
      output.textContent = data.error || 'Failed to start worker';
    }
  } catch (err) {
    output.textContent = err.message;
  }
});
