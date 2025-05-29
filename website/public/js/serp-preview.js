document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('serp-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const url = document.getElementById('serp-url').value;
    const results = document.getElementById('serp-results');
    results.textContent = `Generating SERP preview for ${url}...`;
    // TODO: implement SERP rendering and CTR prediction
  });
});
