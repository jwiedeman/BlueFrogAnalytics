// Common UI helper functions for Rule Builder
/**
 * Attach click-to-toggle behavior for expanding/collapsing details.
 * @param {HTMLElement} header - element to click
 * @param {HTMLElement} container - parent element containing details
 * @param {string} detailSelector - selector for detail element inside container
 */
export function attachToggle(header, container, detailSelector) {
  header.style.cursor = 'pointer';
  header.addEventListener('click', () => {
    const details = container.querySelector(detailSelector);
    if (!details) return;
    details.style.display = (details.style.display === 'none' ? 'block' : 'none');
  });
}