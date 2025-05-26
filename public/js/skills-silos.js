// Animation for hero skill silos

function initSkillLines() {
  const hero = document.querySelector('.hero-content');
  const container = document.getElementById('skills-container');
  if (!hero || !container) return;

  const svg = container.querySelector('svg');
  const silos = Array.from(container.querySelectorAll('.silo'));
  const lines = [];

  function draw() {
    svg.innerHTML = '';
    lines.length = 0;
    const contRect = container.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    silos.forEach((silo) => {
      const rect = silo.getBoundingClientRect();
      const x1 = heroRect.left + heroRect.width / 2 - contRect.left;
      const y1 = 0;
      const x2 = rect.left + rect.width / 2 - contRect.left;

      const y2 = rect.top + rect.height / 2 - contRect.top;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.classList.add('skill-line');
      svg.appendChild(line);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', 4);
      circle.classList.add('skill-pulse');
      svg.appendChild(circle);
      lines.push({ line, circle, silo });
    });
  }

  function animate(time) {
    const t = (time || 0) / 1000;
    lines.forEach(({ line, circle, silo }, idx) => {
      const x1 = parseFloat(line.getAttribute('x1'));
      const y1 = parseFloat(line.getAttribute('y1'));
      const x2 = parseFloat(line.getAttribute('x2'));
      const y2 = parseFloat(line.getAttribute('y2'));
      const progress = (t + idx) % 1;
      const cx = x1 + (x2 - x1) * progress;
      const cy = y1 + (y2 - y1) * progress;
      circle.setAttribute('cx', cx);
      circle.setAttribute('cy', cy);
      if (progress > 0.95) {
        silo.classList.add('glow');
        setTimeout(() => silo.classList.remove('glow'), 500);
      }
    });
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', draw);
  draw();
  requestAnimationFrame(animate);
}

document.addEventListener('DOMContentLoaded', initSkillLines);

