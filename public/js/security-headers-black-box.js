document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('security-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const url = document.getElementById('security-url').value;
    const results = document.getElementById('security-results');
    results.textContent = `Checking security headers for ${url}...`;
    // TODO: fetch headers and generate nginx/Apache snippets
  });
});
