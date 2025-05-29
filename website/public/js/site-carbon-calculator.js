document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('carbon-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const url = document.getElementById('carbon-url').value;
    const results = document.getElementById('carbon-results');
    results.textContent = `Calculating carbon footprint for ${url}...`;
    // TODO: estimate CO2 emissions using page size and data center mix
  });
});
