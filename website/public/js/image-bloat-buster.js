document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('bloat-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('bloat-url').value;
    const results = document.getElementById('bloat-results');
    results.textContent = `Analyzing images on ${url}...`;
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch('/api/tools/image-bloat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) {
        results.textContent = data.error || 'Analysis failed.';
        return;
      }
      const rows = data.images
        .map(i => `<tr><td>${i.src}</td><td>${i.bytes}</td></tr>`) 
        .join('');
      results.innerHTML = `<table class="table table-sm table-bordered"><thead><tr><th>Image</th><th>Bytes</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (err) {
      console.error(err);
      results.textContent = 'Error analyzing images.';
    }
  });
});
