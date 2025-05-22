// Simple ASCII art generator for the hero section
const asciiEl = document.getElementById('ascii-art');
if (asciiEl) {
  // Use the poison dart frog image for the hero background
  const imgUrl =
    'https://media.istockphoto.com/id/93218208/photo/blue-poison-dart-frog-against-white-background.jpg?b=1&s=612x612&w=0&k=20&c=5o7sCMfedFx3TQ16JDbl0jAQLTo5UTfogcFCVwz7bmI=';
  const chars = ' .:-=+*#%@';
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => {
    // Shrink slightly so the frog fits the right side of the hero
    const width = 60;
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
