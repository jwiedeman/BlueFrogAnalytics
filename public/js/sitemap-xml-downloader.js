document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('sitemap-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const url = document.getElementById('sitemap-url').value;
    const results = document.getElementById('sitemap-results');
    results.textContent = `Fetching sitemap for ${url}...`;
    // TODO: fetch sitemap.xml and enable download
  });
});
