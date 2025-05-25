document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('blog-search');
  const tags = document.querySelectorAll('.tag-filter .badge');
  let activeTag = '';

  function filterPosts() {
    const filter = input ? input.value.toLowerCase() : '';
    document.querySelectorAll('.blog-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      const tagMatch = !activeTag || (card.dataset.tags || '').includes(activeTag);
      card.style.display = text.includes(filter) && tagMatch ? '' : 'none';
    });
  }

  if (input) {
    input.addEventListener('input', filterPosts);
  }

  tags.forEach(tag => {
    tag.addEventListener('click', () => {
      if (activeTag === tag.dataset.tag) {
        activeTag = '';
        tag.classList.remove('active');
      } else {
        activeTag = tag.dataset.tag;
        tags.forEach(t => t.classList.remove('active'));
        tag.classList.add('active');
      }
      filterPosts();
    });
  });
});
