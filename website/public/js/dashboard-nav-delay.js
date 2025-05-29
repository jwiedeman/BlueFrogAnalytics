document.addEventListener('DOMContentLoaded', () => {
  const items = document.querySelectorAll('.dashboard-side-nav .nav-item');
  items.forEach(item => {
    const btn = item.querySelector('.btn-toggle');
    const collapse = item.querySelector('.collapse');
    if (!btn || !collapse) return;

    let hideTimer;

    item.addEventListener('mouseenter', () => {
      clearTimeout(hideTimer);
      btn.classList.remove('collapsed');
      btn.setAttribute('aria-expanded', 'true');
      collapse.classList.add('show');
    });

    item.addEventListener('mouseleave', () => {
      hideTimer = setTimeout(() => {
        btn.classList.add('collapsed');
        btn.setAttribute('aria-expanded', 'false');
        collapse.classList.remove('show');
      }, 2000);
    });
  });
});
