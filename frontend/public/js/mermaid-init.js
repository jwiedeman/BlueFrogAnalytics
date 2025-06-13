// Initialize mermaid diagrams on the client
// Loads mermaid from a CDN and renders diagrams found on the page

document.addEventListener('DOMContentLoaded', async () => {
  const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs');
  mermaid.initialize({ startOnLoad: true });
});
