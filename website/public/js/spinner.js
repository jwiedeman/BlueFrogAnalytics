export function showSpinner() {
  const el = document.getElementById('loading-spinner');
  if (el) el.classList.remove('d-none');
}

export function hideSpinner() {
  const el = document.getElementById('loading-spinner');
  if (el) el.classList.add('d-none');
}

window.showSpinner = showSpinner;
window.hideSpinner = hideSpinner;
