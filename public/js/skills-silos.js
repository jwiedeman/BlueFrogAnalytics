// Animation for hero skill silos

function initSkillLines() {
  const container = document.getElementById('skills-container');
  const hero = document.querySelector('.hero-content');
  const featureRotator = document.getElementById('feature-rotator');
  if (!hero || !container || !featureRotator) return;

  const svg = container.querySelector('svg');
  const silos = Array.from(container.querySelectorAll('.silo'));
  const features = Array.from(featureRotator.querySelectorAll('.feature-slide'));
  const lines = [];
  let featureIndex = 0;

  function highlight(names) {
    silos.forEach((s) => s.classList.remove('active'));
    lines.forEach(({ line, circle }) => {
      line.classList.remove('active');
      circle.style.display = 'none';
    });
    lines.forEach(({ line, circle, silo }) => {
      const label = silo.textContent.trim();
      if (names.includes(label)) {
        line.classList.add('active');
        circle.style.display = 'block';
        silo.classList.add('active');
      }
    });
  }

  function showFeature(i) {
    features.forEach((f) => f.classList.remove('prev', 'active', 'next'));
    const prev = (i - 1 + features.length) % features.length;
    const next = (i + 1) % features.length;
    features[i].classList.add('active');
    features[prev].classList.add('prev');
    features[next].classList.add('next');
    const names = (features[i].dataset.silos || '').split(',').map((s) => s.trim());
    draw(features[i]);
    highlight(names);
  }

  function draw(start) {
    svg.innerHTML = '';
    lines.length = 0;
    const contRect = container.getBoundingClientRect();
    const startRect = start.getBoundingClientRect();
    const x1 = startRect.left + startRect.width / 2 - contRect.left;
    const y1 = startRect.top + startRect.height / 2 - contRect.top;
    silos.forEach((silo) => {
      const rect = silo.getBoundingClientRect();
      const x2 = rect.left + rect.width / 2 - contRect.left;
      const y2 = rect.top + rect.height / 2 - contRect.top;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M${x1},${y1} C${x1},${y1 + 40} ${x2},${y2 - 40} ${x2},${y2}`;
      path.setAttribute('d', d);
      path.classList.add('skill-line');
      svg.appendChild(path);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', 4);
      circle.classList.add('skill-pulse');
      svg.appendChild(circle);
      lines.push({ line: path, circle, silo });
    });
  }

  function animate(time) {
    const t = (time || 0) / 1000;
    lines.forEach(({ line, circle, silo }, idx) => {
      if (!line.classList.contains('active')) return;
      const len = line.getTotalLength();
      const progress = (t + idx) % 1;
      const point = line.getPointAtLength(len * progress);
      circle.setAttribute('cx', point.x);
      circle.setAttribute('cy', point.y);
      if (progress > 0.95) {
        circle.style.display = 'none';
        if (!silo.classList.contains('glow')) {
          silo.classList.add('glow');
          setTimeout(() => silo.classList.remove('glow'), 500);
        }
      } else {
        circle.style.display = 'block';
      }
    });
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => draw(features[featureIndex]));
  draw(features[featureIndex]);
  showFeature(featureIndex);
  setInterval(() => {
    featureIndex = (featureIndex + 1) % features.length;
    showFeature(featureIndex);
  }, 3000);
  requestAnimationFrame(animate);
}

document.addEventListener('DOMContentLoaded', initSkillLines);

