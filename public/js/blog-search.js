document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('blog-search');
  if (!input) return;
  input.addEventListener('input', () => {
    const filter = input.value.toLowerCase();
    document.querySelectorAll('.blog-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(filter) ? '' : 'none';
    });
  });
});
