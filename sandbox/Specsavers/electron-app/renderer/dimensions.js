// Dimensions panel functionality
/**
 * Reload and render dimensions definitions.
 */
export async function reloadDimensions() {
  try {
    const dims = await window.api.getDimensions();
    const listEl = document.getElementById('dimensionsList');
    listEl.innerHTML = '';
    if (!dims || dims.length === 0) {
      listEl.innerHTML = '<li class="list-group-item">No dimensions defined.</li>';
    } else {
      dims.forEach(dim => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        // Dimension row header
        const header = document.createElement('div');
        header.className = 'd-flex justify-content-between align-items-center';
        const title = document.createElement('strong');
        title.textContent = dim.key;
        header.appendChild(title);
        // Buttons
        const btnGroup = document.createElement('div');
        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn btn-sm btn-outline-secondary mr-2';
        btnEdit.textContent = 'Edit';
        // Inline editor for this dimension
        btnEdit.addEventListener('click', () => {
          const liEl = li; // closure
          // Editing dimension: open inline editor
          // Toggle editor panel below this item
          const existing = liEl.querySelector('.dim-editor');
          if (existing) {
            // Remove editor if already open
            liEl.removeChild(existing);
            return;
          }
          // Create editor container
          const editor = document.createElement('div');
          editor.className = 'dim-editor mb-2';
          // Build form fields inside editor
          const fields = ['description', 'operator', 'expected', 'pass_msg', 'fail_msg'];
          const inputs = {};
          // Build form fields inside editor, operator field as select
          const operatorOptions = [
            { value: 'exists', label: 'Exists' },
            { value: 'equals', label: 'Equals' },
            { value: 'regex',  label: 'Regex' },
            { value: 'in',     label: 'In List' },
            { value: 'uuid',   label: 'UUID' }
          ];
          fields.forEach(fname => {
            const group = document.createElement('div');
            group.className = 'form-group mb-1';
            const label = document.createElement('label');
            label.textContent = fname.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            group.appendChild(label);
            let control;
            if (fname === 'operator') {
              // operator as dropdown
              control = document.createElement('select');
              control.className = 'form-control form-control-sm';
              operatorOptions.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt.value;
                o.textContent = opt.label;
                if (dim.operator === opt.value) o.selected = true;
                control.appendChild(o);
              });
            } else {
              control = document.createElement('input');
              control.type = 'text';
              control.className = 'form-control form-control-sm';
              control.value = dim[fname] || '';
            }
            group.appendChild(control);
            editor.appendChild(group);
            inputs[fname] = control;
          });
          // Save and Cancel buttons
          const btnSave = document.createElement('button');
          btnSave.className = 'btn btn-sm btn-primary mr-2';
          btnSave.textContent = 'Save';
          btnSave.onclick = async () => {
            const updated = { key: dim.key };
            fields.forEach(f => { updated[f] = inputs[f].value.trim(); });
            try { await window.api.setDimension(updated); } catch (e) { console.error('Failed to save dimension', e); }
            // Refresh list to apply changes
            reloadDimensions();
          };
          const btnCancel = document.createElement('button');
          btnCancel.className = 'btn btn-sm btn-secondary';
          btnCancel.textContent = 'Cancel';
          btnCancel.onclick = () => {
            // Close editor without reloading
            const ed = liEl.querySelector('.dim-editor');
            if (ed) liEl.removeChild(ed);
          };
          editor.appendChild(btnSave);
          editor.appendChild(btnCancel);
          // Append editor panel below existing content
          liEl.appendChild(editor);
        });
        btnGroup.appendChild(btnEdit);
        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-sm btn-outline-danger';
        btnDel.textContent = 'Delete';
        btnDel.onclick = async () => {
          if (confirm(`Delete dimension ${dim.key}?`)) {
            await window.api.removeDimension(dim.key);
            reloadDimensions();
          }
        };
        btnGroup.appendChild(btnDel);
        header.appendChild(btnGroup);
        li.appendChild(header);
        // Description and details
        if (dim.description) {
          const p = document.createElement('p'); p.textContent = dim.description; li.appendChild(p);
        }
        // Show operator and expected
        const details = document.createElement('p');
        details.innerHTML = `<em>Operator:</em> ${dim.operator || ''}, <em>Expected:</em> ${dim.expected || ''}`;
        li.appendChild(details);
        listEl.appendChild(li);
      });
    }
  } catch (e) {
    console.error('Failed to load dimensions', e);
  }
}
/**
 * Initialize dimensions panel controls and expose reloadDimensions globally.
 */
export function initDimensions() {
  window.reloadDimensions = reloadDimensions;
  const reloadBtn = document.getElementById('reloadDimensions');
  if (reloadBtn) reloadBtn.onclick = () => reloadDimensions();
  const addBtn = document.getElementById('addDimensionBtn');
  if (addBtn) {
    addBtn.onclick = async () => {
      const key = prompt('Dimension key:');
      if (!key) return;
      await window.api.setDimension({ key });
      reloadDimensions();
    };
  }
}
window.addEventListener('DOMContentLoaded', initDimensions);