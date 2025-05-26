document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('a11y-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const url = document.getElementById('a11y-url').value;
    const results = document.getElementById('a11y-results');
    results.textContent = `Running accessibility test for ${url}...`;
    // TODO: integrate Lighthouse accessibility API
  });
});

