document.addEventListener('DOMContentLoaded', () => {
  const popovers = document.querySelectorAll('[data-bs-toggle="popover"]');
  popovers.forEach(el => new bootstrap.Popover(el, { trigger: 'hover' }));
});
