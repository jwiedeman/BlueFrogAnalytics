// Whitelist panel functionality
/**
 * Reload and render the whitelist domains.
 */
export async function reloadWhitelist() {
  try {
    const data = await window.api.getWhitelist();
    const ul = document.getElementById('whitelist');
    ul.innerHTML = '';
    data.forEach(domain => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      const span = document.createElement('span');
      span.textContent = domain;
      li.appendChild(span);
      const btnGroup = document.createElement('div');
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-sm btn-outline-secondary mr-2';
      btnEdit.textContent = 'Edit';
      btnEdit.onclick = async () => {
        const newDomain = prompt('Edit domain:', domain);
        if (newDomain && newDomain.trim() && newDomain.trim() !== domain) {
          await window.api.updateWhitelist(domain, newDomain.trim());
          reloadWhitelist();
        }
      };
      btnGroup.appendChild(btnEdit);
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-sm btn-outline-danger';
      btnDelete.textContent = 'Delete';
      btnDelete.onclick = async () => {
        if (confirm(`Remove domain "${domain}" from whitelist?`)) {
          await window.api.removeWhitelist(domain);
          reloadWhitelist();
        }
      };
      btnGroup.appendChild(btnDelete);
      li.appendChild(btnGroup);
      ul.appendChild(li);
    });
  } catch (e) {
    console.error('Failed to load whitelist', e);
  }
}
/**
 * Initialize whitelist panel controls and expose reloadWhitelist globally.
 */
export function initWhitelist() {
  window.reloadWhitelist = reloadWhitelist;
  const addBtn = document.getElementById('addDomain');
  if (addBtn) {
    addBtn.onclick = async () => {
      const input = document.getElementById('newDomain');
      const val = input.value.trim();
      if (!val) return;
      let list = await window.api.getWhitelist();
      if (!list.includes(val)) list.push(val);
      await window.api.setWhitelist(list);
      input.value = '';
      reloadWhitelist();
    };
  }
}
// Auto-initialize on DOM load
window.addEventListener('DOMContentLoaded', initWhitelist);