document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('drag-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const url = document.getElementById('drag-url').value;
    const results = document.getElementById('drag-results');
    results.textContent = `Running Tag Drag Race for ${url}...`;
    // TODO: implement waterfall analysis
  });
});
