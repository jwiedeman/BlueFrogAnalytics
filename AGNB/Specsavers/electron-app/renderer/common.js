// Common UI helper functions for QA Proxy renderer modules
/**
 * Get indices of list items whose detail element is expanded (not display: none).
 * @param {HTMLElement} listEl - container of .list-group-item elements
 * @param {string} detailSelector - selector for detail element within each item
 * @returns {Set<number>} set of item indices that are expanded
 */
export function getExpandedIndices(listEl, detailSelector) {
  const set = new Set();
  listEl.querySelectorAll('.list-group-item').forEach((container, idx) => {
    const details = container.querySelector(detailSelector);
    if (details && details.style.display !== 'none') set.add(idx);
  });
  return set;
}
/**
 * Attach click toggle behavior to a header element to show/hide detail in a container.
 * @param {HTMLElement} header - clickable header element
 * @param {HTMLElement} container - parent container element
 * @param {string} detailSelector - selector for detail element within container
 */
export function attachToggle(header, container, detailSelector) {
  header.style.cursor = 'pointer';
  header.addEventListener('click', () => {
    const details = container.querySelector(detailSelector);
    if (!details) return;
    details.style.display = (details.style.display === 'none' ? 'block' : 'none');
  });
}
/**
 * Create a Bootstrap badge element.
 * @param {string} text - badge text
 * @param {string} [variant=secondary] - badge variant (e.g., 'success','danger')
 * @returns {HTMLElement} span.badge element
 */
export function makeBadge(text, variant = 'secondary') {
  const span = document.createElement('span');
  span.className = `badge badge-${variant} mr-1`;
  span.textContent = text;
  return span;
}