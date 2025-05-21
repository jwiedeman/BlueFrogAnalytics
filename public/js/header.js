document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.querySelector('.bx--header__menu-trigger');
  const nav = document.querySelector('.bx--header__nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      nav.classList.toggle('nav-open');
    });
  }
});
