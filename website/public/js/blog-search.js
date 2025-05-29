document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('blog-search');
  const tags = document.querySelectorAll('.tag-filter .badge');
  const cards = Array.from(document.querySelectorAll('#posts-list .blog-card'));
  const pagination = document.getElementById('blog-pagination');
  const PAGE_SIZE = 18; // 6 rows of 3 columns
  let activeTag = '';
  let currentPage = 1;

  function getFiltered() {
    const filter = input ? input.value.toLowerCase() : '';
    return cards.filter(card => {
      const text = card.textContent.toLowerCase();
      const tagMatch = !activeTag || (card.dataset.tags || '').includes(activeTag);
      return text.includes(filter) && tagMatch;
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

  if (input) {
    input.addEventListener('input', () => {
      currentPage = 1;
      render();
    });
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
