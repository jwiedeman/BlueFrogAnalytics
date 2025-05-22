document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.querySelector('.blog-carousel');
  if (!carousel) return;
  const slides = carousel.querySelectorAll('.carousel-slide');
  let index = 0;
  function show(n) {
    slides.forEach((s, i) => { s.hidden = i !== n; });
  }
  const prev = carousel.querySelector('.carousel-prev');
  const next = carousel.querySelector('.carousel-next');
  prev && prev.addEventListener('click', () => {
    index = (index - 1 + slides.length) % slides.length;
    show(index);
  });
  next && next.addEventListener('click', () => {
    index = (index + 1) % slides.length;
    show(index);
  });
});
