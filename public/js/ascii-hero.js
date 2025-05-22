// Simple ASCII art generator for the hero section
const asciiEl = document.getElementById('ascii-art');
if (asciiEl) {
  const imgUrl = 'https://static.taminomartinius.de/avatar.png';
  const chars = ' .:-=+*#%@';
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => {
    const width = 80;
    const ratio = img.height / img.width;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.floor(width * ratio);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let html = '';
    for (let y = 0; y < canvas.height; y++) {
      let row = '';
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 765;
        const index = Math.floor((1 - brightness) * (chars.length - 1));
        const ch = chars[index];
        row += `<span style="color:rgb(${r},${g},${b})">${ch}</span>`;
      }
      html += `<div>${row}</div>`;
    }
    asciiEl.innerHTML = html;
  };
  img.src = imgUrl;
}
