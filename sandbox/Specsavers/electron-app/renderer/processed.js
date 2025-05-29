import { getExpandedIndices, makeBadge } from './common.js';

/**
 * Display processed hits items in the Processed Hits panel.
 * @param {Array<{flow: object, results: object[]}>} items
 */
/**
 * Render processed hits items, including dimension evaluations.
 * @param {Array<{flow: object, results: object[]}>} items
 * @param {Array<{key:string,description:string,operator:string,expected:string,pass_msg:string,fail_msg:string}>} dimsDefs
 */
export function showProcessedItems(items, dimsDefs, rulesDefs) {
  const alertEl = document.getElementById('processedAlert');
  const listEl = document.getElementById('processedHitsList');
  listEl.innerHTML = '';
  if (!items || items.length === 0) {
    alertEl.style.display = 'block';
    return;
  }
  alertEl.style.display = 'none';
  items.forEach(item => {
    const { flow, results } = item;
    const container = document.createElement('div');
    container.className = 'list-group-item';
    // Header: method and path
    const header = document.createElement('div');
    header.className = 'd-flex justify-content-between';
    const title = document.createElement('div');
    title.innerHTML = `<strong>${flow.request.method}</strong> ${flow.request.host}${flow.request.path}`;
    header.appendChild(title);
    // Rule badges
    const badgeContainer = document.createElement('div');
    results.forEach(r => badgeContainer.appendChild(makeBadge(r.id, r.passed ? 'success' : 'danger')));
    header.appendChild(badgeContainer);
    // Header: method and path + badges
    container.appendChild(header);
    // Show each rule's condition results and dimension tests
    results.forEach(r => {
      const ruleDef = rulesDefs.find(rd => rd.id === r.id);
      if (!ruleDef) return;
      // Section title for this rule
      const section = document.createElement('h6');
      section.textContent = `Rule: ${ruleDef.name || ruleDef.id} (${r.passed ? 'PASS' : 'FAIL'})`;
      container.appendChild(section);
      // Conditions table
      if (Array.isArray(ruleDef.conditions) && ruleDef.conditions.length > 0) {
        const condTable = document.createElement('table');
        condTable.className = 'table table-sm mb-2';
        const condHead = document.createElement('thead');
        condHead.innerHTML = '<tr><th>Condition</th><th>Operator</th><th>Expected</th><th>Actual</th><th>Result</th></tr>';
        condTable.appendChild(condHead);
        const condBody = document.createElement('tbody');
        ruleDef.conditions.forEach(cond => {
          // Extract actual value
          const [source, ...pathParts] = cond.extractor.split('.');
          let actual;
          const req = flow.request;
          let dataSrc = null;
          if (source === 'query') dataSrc = req.query;
          else if (source === 'form') dataSrc = req.form || {};
          else if (source === 'json') dataSrc = req.json || {};
          else if (source === 'body') dataSrc = req.body;
          if (dataSrc && pathParts.length) {
            actual = pathParts.reduce((o, k) => (o && o[k] != null) ? o[k] : undefined, dataSrc);
          } else if (dataSrc != null) {
            actual = dataSrc;
          }
          // Evaluate
          let condPassed = false;
          try {
            const { type, value: exp } = cond;
            const strAct = actual != null ? String(actual) : '';
            if (type === 'exists') condPassed = actual !== undefined;
            else if (type === 'equals') condPassed = strAct === String(exp);
            else if (type === 'regex') condPassed = new RegExp(exp).test(strAct);
            else if (type === 'in') {
              let arr;
              try { arr = JSON.parse(exp); } catch { arr = String(exp).split(',').map(s => s.trim()); }
              condPassed = Array.isArray(arr) && arr.includes(actual);
            }
          } catch { condPassed = false; }
          const condRow = document.createElement('tr');
          condRow.className = condPassed ? 'table-success' : 'table-danger';
          condRow.innerHTML = `<td>${cond.extractor}</td><td>${cond.type}</td><td>${cond.value || ''}</td><td>${actual != null ? actual : ''}</td><td>${condPassed ? 'PASS' : 'FAIL'}</td>`;
          condBody.appendChild(condRow);
        });
        condTable.appendChild(condBody);
        container.appendChild(condTable);
      }
      // Dimension tests table
      if (Array.isArray(ruleDef.dependencies) && ruleDef.dependencies.length > 0) {
        const dimTable = document.createElement('table');
        dimTable.className = 'table table-sm mb-3';
        const dimHead = document.createElement('thead');
        dimHead.innerHTML = '<tr><th>Dimension</th><th>Required</th><th>Value</th><th>Result</th><th>Message</th></tr>';
        dimTable.appendChild(dimHead);
        const dimBody = document.createElement('tbody');
        ruleDef.dependencies.forEach(dep => {
          // existing dimension test logic (unchanged)
          const key = dep.key;
          const required = dep.required;
          const dimDef = dimsDefs.find(d => d.key === key) || {};
          const params = {};
          const rr = flow.request;
          if (rr.query) Object.assign(params, rr.query);
          if (rr.form) Object.assign(params, rr.form);
          if (!rr.form && rr.body) {
            const usp = new URLSearchParams(rr.body);
            for (const [k, v] of usp.entries()) params[k] = v;
          }
          if (rr.json && typeof rr.json === 'object') Object.assign(params, rr.json);
          const val = params[key];
          let passedDim;
          switch (dimDef.operator) {
            case 'exists': passedDim = val !== undefined; break;
            case 'equals': passedDim = String(val) === String(dimDef.expected); break;
            case 'regex': try { passedDim = new RegExp(dimDef.expected).test(String(val)); } catch { passedDim = false; } break;
            case 'in': {
              let arr2;
              try { arr2 = JSON.parse(dimDef.expected); } catch { arr2 = String(dimDef.expected).split(',').map(s=>s.trim()); }
              passedDim = Array.isArray(arr2) && arr2.includes(val);
              break;
            }
            case 'uuid': {
              const re2 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              passedDim = re2.test(String(val)); break;
            }
            default: passedDim = val !== undefined; break;
          }
          if (required && val === undefined) passedDim = false;
          const msg = passedDim ? (dimDef.pass_msg || ruleDef.pass_msg || 'PASS') : (dimDef.fail_msg || ruleDef.fail_msg || 'FAIL');
          const trDim = document.createElement('tr');
          trDim.className = passedDim ? 'table-success' : 'table-danger';
          trDim.innerHTML = `<td>${key}</td><td>${required ? 'Yes':'No'}</td><td>${val!=null?val:''}</td><td>${passedDim?'PASS':'FAIL'}</td><td>${msg}</td>`;
          dimBody.appendChild(trDim);
        });
        dimTable.appendChild(dimBody);
        container.appendChild(dimTable);
      }
    });
    // Toggle full payload
    const toggleLink = document.createElement('a');
    toggleLink.href = '#';
    toggleLink.className = 'small';
    toggleLink.textContent = 'Show full payload';
    container.appendChild(toggleLink);
    // Build full payload details (shown only when toggled)
    const details = document.createElement('div');
    details.className = 'processed-details';
    details.style.display = 'none';
    // Build Beacon Data table inside details
    const beaconSection = document.createElement('h6');
    beaconSection.textContent = 'Beacon Data';
    details.appendChild(beaconSection);
    const beaconTable = document.createElement('table');
    beaconTable.className = 'table table-sm mb-3';
    const bthead = document.createElement('thead');
    bthead.innerHTML = '<tr><th>Key</th><th>Value</th></tr>';
    beaconTable.appendChild(bthead);
    const btBody = document.createElement('tbody');
    const params2 = {};
    const req2 = flow.request;
    if (req2.query) Object.assign(params2, req2.query);
    if (req2.form) Object.assign(params2, req2.form);
    if (!req2.form && req2.body) {
      const usp2 = new URLSearchParams(req2.body);
      for (const [k, v] of usp2.entries()) params2[k] = v;
    }
    if (req2.json && typeof req2.json === 'object') Object.assign(params2, req2.json);
    Object.entries(params2).forEach(([key, val]) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${key}</td><td>${val}</td>`;
      btBody.appendChild(tr);
    });
    beaconTable.appendChild(btBody);
    details.appendChild(beaconTable);
    container.appendChild(details);
    // Toggle via the Show full payload link
    toggleLink.addEventListener('click', e => {
      e.preventDefault();
      if (details.style.display === 'none') {
        details.style.display = 'block';
        toggleLink.textContent = 'Hide full payload';
      } else {
        details.style.display = 'none';
        toggleLink.textContent = 'Show full payload';
      }
    });
    listEl.appendChild(container);
  });
}

/**
 * Fetch and render processed hits via IPC, auto-add dimensions.
 */
export async function reloadProcessed() {
  try {
    const data = await window.api.getProcessed();
    // Auto-add only new dimensions from processed hits
    try {
      const dimKeys = new Set();
      data.forEach(item => {
        const req = item.flow.request;
        if (req.query) Object.keys(req.query).forEach(k => dimKeys.add(k));
        if (req.form) Object.keys(req.form).forEach(k => dimKeys.add(k));
        if (req.json && typeof req.json === 'object') Object.keys(req.json).forEach(k => dimKeys.add(k));
      });
      // Fetch existing dimensions to avoid duplicates
      const existing = await window.api.getDimensions();
      const existingKeys = new Set(existing.map(d => d.key));
      for (const key of dimKeys) {
        if (!existingKeys.has(key)) {
          try {
            await window.api.setDimension({ key });
          } catch (err) {
            console.error(`Failed to auto-add dimension "${key}":`, err);
          }
        }
      }
    } catch (err) {
      console.error('Failed to auto-add dimensions:', err);
    }
    const dimsDefs = await window.api.getDimensions();
    // Fetch current rule definitions for dependency-based evaluation
    const rulesDefs = await window.api.getRules();
    const listEl = document.getElementById('processedHitsList');
    const prevExpanded = getExpandedIndices(listEl, '.processed-details');
    const alertEl = document.getElementById('processedAlert');
    listEl.innerHTML = '';
    if (!data || data.length === 0) {
      alertEl.style.display = 'block';
    } else {
      alertEl.style.display = 'none';
      showProcessedItems(data, dimsDefs, rulesDefs);
      // restore expanded state
      const items = listEl.querySelectorAll('.list-group-item');
      items.forEach((container, idx) => {
        const details = container.querySelector('.processed-details');
        if (details && prevExpanded.has(idx)) details.style.display = 'block';
      });
    }
  } catch (e) {
    console.error('Failed to load processed hits', e);
  }
}

/**
 * Initialize Processed Hits panel controls and expose reloadProcessed globally.
 */
export function initProcessed() {
  window.reloadProcessed = reloadProcessed;
  window.showProcessedItems = showProcessedItems;
  const reloadBtn = document.getElementById('reloadProcessed');
  if (reloadBtn) reloadBtn.onclick = () => reloadProcessed();
  const clearBtn = document.getElementById('clearProcessed');
  if (clearBtn) clearBtn.onclick = async () => {
    try {
      await window.api.clearProcessed();
      reloadProcessed();
    } catch (e) {
      console.error('Failed to clear processed hits', e);
    }
  };
}
// Auto-initialize on DOM load
window.addEventListener('DOMContentLoaded', initProcessed);