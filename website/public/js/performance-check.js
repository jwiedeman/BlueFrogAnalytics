document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('perf-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const url = document.getElementById('perf-url').value;
    const results = document.getElementById('perf-results');
    results.textContent = `Running performance test for ${url}...`;
    // TODO: integrate Lighthouse performance API
  });
});

