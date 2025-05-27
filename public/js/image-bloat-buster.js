document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('bloat-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const url = document.getElementById('bloat-url').value;
    const results = document.getElementById('bloat-results');
    results.textContent = `Analyzing images on ${url}...`;
    // TODO: detect oversized images and perform compression
  });
});
