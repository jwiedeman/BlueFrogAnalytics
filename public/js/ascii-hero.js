// Simple ASCII art generator for the hero section
const asciiEl = document.getElementById('ascii-art');
if (asciiEl) {
  // Configuration variables for the hero frog ASCII art
  const imgUrl = 'https://media.istockphoto.com/id/93218208/photo/blue-poison-dart-frog-against-white-background.jpg?b=1&s=612x612&w=0&k=20&c=5o7sCMfedFx3TQ16JDbl0jAQLTo5UTfogcFCVwz7bmI=';
  const width = 150;              // Width of ASCII art in characters
  const charAspect = 0.55;        // Character height/width ratio
  const backgroundThreshold = 0.92; // Skip pixels brighter than this
  const chars = ' .:-=+*#%@';     // Characters for art from light to dark

  // Animation parameters
  const bWeightMin = 1.0, bWeightMax = 5.0;
  const brightnessDivMin = 750, brightnessDivMax = 1200;
  const steps = 200;
  const rWeight = 1.0, gWeight = 1.0;
  const bStep = (bWeightMax - bWeightMin) / steps;
  const brightnessStep = (brightnessDivMax - brightnessDivMin) / steps;

  // Runtime state
  let bWeightCurrent = bWeightMax;
  let brightnessDivCurrent = brightnessDivMin;
  let bDirection = -1, brightnessDirection = 1;
  let tick = 0;

  let canvas, ctx;

  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.onload = () => {
    // Initialize canvas once image loads
    const ratio = (img.height / img.width) * charAspect;
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.floor(width * ratio);
    ctx = canvas.getContext('2d');
    renderAscii();
 
    startAnimation();
  };
  img.src = imgUrl;

  function renderAscii() {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let html = '';
    for (let y = 0; y < canvas.height; y++) {
      let row = '';
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const brightness = (r + g + b) / brightnessDivCurrent;
        if (brightness > backgroundThreshold) {
          row += ' ';
          continue;
        }
        // Compute character index and clamp to valid range
        let idx = Math.floor((1 - brightness) * (chars.length - 1));
        idx = Math.max(0, Math.min(chars.length - 1, idx));
        const ch = chars[idx];
        const rr = Math.min(255, Math.floor(r * rWeight));
        const gg = Math.min(255, Math.floor(g * gWeight));
        const bb = Math.min(255, Math.floor(b * bWeightCurrent));
        row += `<span style="color:rgb(${rr},${gg},${bb})">${ch}</span>`;
      }
      html += `<div>${row}</div>`;
    }
    asciiEl.innerHTML = html;
  }

  function animationTick() {
    tick++;
    // Slide blue weight
    bWeightCurrent += bDirection * bStep;
    if (bWeightCurrent <= bWeightMin || bWeightCurrent >= bWeightMax) {
      bWeightCurrent = Math.max(bWeightMin, Math.min(bWeightMax, bWeightCurrent));
      bDirection *= -1;
    }
    // Slide brightness divisor
    brightnessDivCurrent += brightnessDirection * brightnessStep;
    if (brightnessDivCurrent <= brightnessDivMin || brightnessDivCurrent >= brightnessDivMax) {
      brightnessDivCurrent = Math.max(brightnessDivMin, Math.min(brightnessDivMax, brightnessDivCurrent));
      brightnessDirection *= -1;
    }
    // Re-render every 2nd tick
    if (tick % 8 === 0) renderAscii();
  }

  let animInterval = null;
  function startAnimation() {
    if (!animInterval) animInterval = setInterval(animationTick, 50);
  }
  function stopAnimation() {
    if (animInterval) { clearInterval(animInterval); animInterval = null; }
  }

  function addControls() {
    const controls = document.createElement('div');
    controls.style.textAlign = 'center';
    controls.style.marginTop = '0.5rem';
    const btn = document.createElement('button');
    btn.textContent = 'Pause';
    btn.onclick = () => {
      if (animInterval) { stopAnimation(); btn.textContent = 'Resume'; }
      else { startAnimation(); btn.textContent = 'Pause'; }
    };
    controls.appendChild(btn);
    asciiEl.parentNode.insertBefore(controls, asciiEl.nextSibling);
  }
}
