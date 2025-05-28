document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contrast-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const url = document.getElementById('contrast-url').value;
    const results = document.getElementById('contrast-results');
    results.textContent = `Generating contrast heat-map for ${url}...`;
    // TODO: implement contrast overlay and screen reader preview
  });
});
