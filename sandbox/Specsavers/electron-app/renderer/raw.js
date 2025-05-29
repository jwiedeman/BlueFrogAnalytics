import { attachToggle } from './common.js';

/**
 * Reload and render raw traffic flows in the Raw Traffic panel.
 */
export async function reloadFlows() {
  try {
    const data = await window.api.getFlows();
    const alertEl = document.getElementById('rawAlert');
    if (!data || data.length === 0) {
      alertEl.style.display = 'block';
    } else {
      alertEl.style.display = 'none';
    }
    const listEl = document.getElementById('rawHitsList');
    const prevExpanded = new Set();
    listEl.querySelectorAll('.list-group-item').forEach((container, idx) => {
      const details = container.querySelector('.raw-details');
      if (details && details.style.display !== 'none') prevExpanded.add(idx);
    });
    listEl.innerHTML = '';
    data.forEach((flow, i) => {
      const container = document.createElement('div');
      container.className = 'list-group-item';
      const header = document.createElement('div');
      header.innerHTML = `<strong>${flow.request.method}</strong> ${flow.request.host}${flow.request.path}`;
      container.appendChild(header);
      // Create rule button
      const summary = document.createElement('div');
      const btn = document.createElement('button');
      btn.className = 'btn btn-sm btn-outline-primary';
      btn.textContent = 'Create Rule';
      btn.onclick = () => window.openCreateRuleFromFlow({ flow, results: [] });
      summary.appendChild(btn);
      container.appendChild(summary);
      // Details section
      const details = document.createElement('div');
      details.className = 'raw-details pl-3';
      details.style.display = prevExpanded.has(i) ? 'block' : 'none';
      // Query params
      if (flow.request.query && Object.keys(flow.request.query).length) {
        const qh = document.createElement('strong'); qh.textContent = 'Query Parameters:';
        details.appendChild(qh);
        const qul = document.createElement('ul'); qul.className = 'mb-2';
        Object.entries(flow.request.query).forEach(([k,v]) => {
          const li = document.createElement('li'); li.textContent = `${k}: ${v}`; qul.appendChild(li);
        });
        details.appendChild(qul);
      }
      // Form data
      if (flow.request.form && Object.keys(flow.request.form).length) {
        const fh = document.createElement('strong'); fh.textContent = 'Form Data:';
        details.appendChild(fh);
        const ful = document.createElement('ul'); ful.className = 'mb-2';
        Object.entries(flow.request.form).forEach(([k,v]) => {
          const li = document.createElement('li'); li.textContent = `${k}: ${v}`; ful.appendChild(li);
        });
        details.appendChild(ful);
      }
      // JSON body
      if (flow.request.json && typeof flow.request.json === 'object') {
        const jh = document.createElement('strong'); jh.textContent = 'JSON Body:';
        details.appendChild(jh);
        const pre = document.createElement('pre'); pre.textContent = JSON.stringify(flow.request.json, null, 2); pre.className = 'mb-2';
        details.appendChild(pre);
      }
      // Raw body params
      if (flow.request.body && typeof flow.request.body === 'string') {
        const params = new URLSearchParams(flow.request.body);
        if ([...params].length) {
          const bh = document.createElement('strong'); bh.textContent = 'Body Params:';
          details.appendChild(bh);
          const bul = document.createElement('ul'); bul.className = 'mb-2';
          params.forEach((v,k) => {
            const li = document.createElement('li'); li.textContent = `${k}: ${v}`; bul.appendChild(li);
          });
          details.appendChild(bul);
        }
      }
      container.appendChild(details);
      attachToggle(header, container, '.raw-details');
      listEl.appendChild(container);
    });
  } catch (e) {
    console.error('Failed to load flows', e);
  }
}
/**
 * Initialize Raw Traffic panel controls and expose reloadFlows globally.
 */
export function initRaw() {
  window.reloadFlows = reloadFlows;
  const reloadBtn = document.getElementById('reloadFlows');
  if (reloadBtn) reloadBtn.onclick = () => reloadFlows();
  const clearBtn = document.getElementById('clearFlows');
  if (clearBtn) clearBtn.onclick = async () => {
    try {
      await window.api.clearFlows();
      reloadFlows();
    } catch (e) {
      console.error('Failed to clear flows', e);
    }
  };
}
// Auto-initialize on DOM load
window.addEventListener('DOMContentLoaded', initRaw);