document.addEventListener('DOMContentLoaded', () => {
  const dashOffcanvasEl = document.getElementById('dashOffcanvas');
  if (dashOffcanvasEl) {
    const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(dashOffcanvasEl);
    dashOffcanvasEl.querySelectorAll('a.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        offcanvas.hide();
      });
    });
  }

  const docsOffcanvasEl = document.getElementById('docsOffcanvas');
  if (docsOffcanvasEl) {
    const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(docsOffcanvasEl);
    docsOffcanvasEl.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        offcanvas.hide();
      });
    });
  }
});
