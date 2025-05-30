document.addEventListener('DOMContentLoaded', () => {
  const tags = document.querySelectorAll('.tag-filter .badge');
  const cards = Array.from(document.querySelectorAll('#author-posts .blog-card'));
  const pagination = document.getElementById('author-pagination');
  const PAGE_SIZE = 18;
  let activeTag = '';
  let currentPage = 1;

  function getFiltered() {
    return cards.filter(card => {
      const tagMatch = !activeTag || (card.dataset.tags || '').includes(activeTag);
      return tagMatch;
    });
  }

  function renderPagination(total) {
    if (!pagination) return;
    pagination.innerHTML = '';
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (totalPages <= 1) return;

    const ul = document.createElement('ul');
    ul.className = 'pagination justify-content-center';

    function addItem(label, page, disabled, active) {
      const li = document.createElement('li');
      li.className = 'page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '');
      const a = document.createElement('a');
      a.href = '#';
      a.className = 'page-link';
      a.textContent = label;
      a.addEventListener('click', e => {
        e.preventDefault();
        if (!disabled && page !== currentPage) {
          currentPage = page;
          render();
        }
      });
      li.appendChild(a);
      ul.appendChild(li);
    }

    addItem('Prev', currentPage - 1, currentPage === 1);
    for (let i = 1; i <= totalPages; i++) {
      addItem(String(i), i, false, i === currentPage);
    }
    addItem('Next', currentPage + 1, currentPage === totalPages);
    pagination.appendChild(ul);
  }

  function render() {
    const filtered = getFiltered();
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    cards.forEach(card => {
      const wrapper = card.closest('.col') || card;
      wrapper.style.display = 'none';
    });
    filtered.forEach((card, index) => {
      const wrapper = card.closest('.col') || card;
      const start = (currentPage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      wrapper.style.display = index >= start && index < end ? '' : 'none';
    });
    renderPagination(filtered.length);
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
      currentPage = 1;
      render();
    });
  });

  render();
});
