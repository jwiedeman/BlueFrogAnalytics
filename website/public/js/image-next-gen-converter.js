document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('convert-input');
  const button = document.getElementById('convert-button');
  const results = document.getElementById('convert-results');
  if (!input || !button) return;
  button.addEventListener('click', () => {
    const file = input.files[0];
    if (!file) return;
    results.textContent = `Converting ${file.name} to WebP...`;
    // TODO: convert image to WebP or AVIF
  });
});
