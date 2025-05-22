function initHeaderMenu() {
  const menuButton = document.querySelector('.bx--header__menu-trigger');
  const sideNav = document.getElementById('side-nav');
  if (menuButton && sideNav) {
    menuButton.addEventListener('click', () => {
      const expanded = sideNav.classList.toggle('bx--side-nav--expanded');
      menuButton.setAttribute('aria-expanded', expanded);
    });
    sideNav.querySelectorAll('.bx--side-nav__link').forEach((link) => {
      link.addEventListener('click', () => {
        sideNav.classList.remove('bx--side-nav--expanded');
        menuButton.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

if (document.readyState !== 'loading') {
  initHeaderMenu();
} else {
  window.addEventListener('load', initHeaderMenu);
}
