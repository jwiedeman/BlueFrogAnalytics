document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('robots-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const url = document.getElementById('robots-url').value;
    const results = document.getElementById('robots-results');
    results.textContent = `Fetching robots.txt for ${url}...`;
    // TODO: fetch robots.txt and enable download
  });
});
