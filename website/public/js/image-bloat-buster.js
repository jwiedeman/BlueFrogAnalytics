document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('bloat-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('bloat-url').value;
    const results = document.getElementById('bloat-results');
    results.textContent = `Analyzing images on ${url}...`;
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/tools/image-bloat`, {
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
        .map(i => {
          const flag = i.heavy ? '⚠️' : '';
          const dims = i.width && i.height ? `${i.width}×${i.height}` : '';
          return `<tr class="${i.heavy ? 'table-warning' : ''}"><td><a href="${i.src}" target="_blank">${i.src}</a></td><td>${i.bytes}</td><td>${dims}</td><td>${flag}</td><td><button class="btn btn-sm btn-secondary convert-btn" data-src="${i.src}" data-bytes="${i.bytes}">Convert</button> <span class="conversion-result"></span></td></tr>`;
        })
        .join('');
      results.innerHTML = `<table class="table table-sm table-bordered"><thead><tr><th>Image</th><th>Bytes</th><th>Dimensions</th><th></th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`;
    } catch (err) {
      console.error(err);
      results.textContent = 'Error analyzing images.';
    }
  });

  document.getElementById('bloat-results').addEventListener('click', async e => {
    if (!e.target.classList.contains('convert-btn')) return;
    const btn = e.target;
    const src = btn.dataset.src;
    const origBytes = Number(btn.dataset.bytes) || 0;
    const resultSpan = btn.nextElementSibling;
    btn.disabled = true;
    resultSpan.textContent = 'Converting...';
    try {
      const resp = await fetch(src);
      const blob = await resp.blob();
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const token = await window.firebaseAuth.currentUser.getIdToken();
          const res = await fetch(`${API_BASE}/api/tools/image-convert`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ filename: src.split('/').pop(), data: reader.result })
          });
          const data = await res.json();
          if (!res.ok) {
            resultSpan.textContent = data.error || 'Conversion failed';
            btn.disabled = false;
            return;
          }
          const newBytes = Math.round((data.data.length * 3) / 4);
          const reduction = origBytes ? Math.round(100 * (origBytes - newBytes) / origBytes) : 0;
          const link = document.createElement('a');
          link.href = 'data:image/webp;base64,' + data.data;
          link.download = data.filename;
          link.textContent = `Download (${reduction}% smaller)`;
          resultSpan.textContent = '';
          resultSpan.appendChild(link);
          btn.disabled = false;
        } catch (err) {
          resultSpan.textContent = 'Error uploading image.';
          btn.disabled = false;
        }
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      resultSpan.textContent = 'Conversion failed';
      btn.disabled = false;
    }
  });
});
