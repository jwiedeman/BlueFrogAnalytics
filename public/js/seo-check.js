document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('seo-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const url = document.getElementById('seo-url').value;
    const results = document.getElementById('seo-results');
    results.textContent = `Running SEO test for ${url}...`;
    // TODO: integrate Lighthouse SEO API
  });
});

