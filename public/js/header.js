function initHeaderMenu() {
  const menuButton = document.querySelector('.bx--header__menu-trigger');
  const nav = document.querySelector('.bx--header__nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      nav.classList.toggle('nav-open');
      menuButton.setAttribute('aria-expanded', nav.classList.contains('nav-open'));
    });
  }
}

if (document.readyState !== 'loading') {
  initHeaderMenu();
} else {
  document.addEventListener('DOMContentLoaded', initHeaderMenu);
}
