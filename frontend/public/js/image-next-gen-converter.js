import { logTestStatus } from './test-status.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const input = document.getElementById('convert-input');
  const button = document.getElementById('convert-button');
  const results = document.getElementById('convert-results');
  if (!input || !button) return;
  button.addEventListener('click', async () => {
    const file = input.files[0];
    if (!file) return;
    results.textContent = `Converting ${file.name} to WebP...`;
    logTestStatus('image-convert', 'started');
    try {
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
            body: JSON.stringify({ filename: file.name, data: reader.result })
          });
          const data = await res.json();
          if (!res.ok) {
            results.textContent = data.error || 'Conversion failed';
            logTestStatus('image-convert', 'failed');
            return;
          }
          const link = document.createElement('a');
          link.href = 'data:image/webp;base64,' + data.data;
          link.download = data.filename;
          link.textContent = 'Download converted image';
          results.textContent = '';
          results.appendChild(link);
          logTestStatus('image-convert', 'complete');
        } catch (err) {
          results.textContent = 'Error uploading image.';
          logTestStatus('image-convert', 'error');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      results.textContent = 'Conversion failed.';
      logTestStatus('image-convert', 'error');
    }
  });
});
