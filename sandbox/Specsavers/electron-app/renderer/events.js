// dependencies list helper is defined locally; no import from dimensions.js
import { attachToggle } from './common.js';

// Events (Rules) panel functionality
let currentRules = [];
let editingRuleId = null;

/**
 * Fetch rules via IPC
 */
export async function loadRulesData() {
  return await window.api.getRules();
}

/**
 * Render and display the list of rules
 */
export async function reloadRules() {
  try {
    currentRules = await loadRulesData();
    const listEl = document.getElementById('rulesList');
    listEl.innerHTML = '';
    currentRules.forEach(rule => {
      const item = document.createElement('div');
      item.className = 'list-group-item';
      const header = document.createElement('h5');
      header.textContent = `${rule.name || rule.id} (${rule.id})`;
      item.appendChild(header);
      const info = document.createElement('p');
      info.innerHTML = `<strong>Domain:</strong> ${rule.domain}  <strong>Method:</strong> ${rule.method}`;
      item.appendChild(info);
      const cond = document.createElement('p');
      cond.innerHTML = `<strong>Conditions:</strong> ${rule.conditions.map(c=>c.extractor+ ' ' + c.type + (c.value? ' ' + c.value : '')).join('; ')}`;
      item.appendChild(cond);
      if (rule.dependencies && rule.dependencies.length) {
        const depsText = rule.dependencies.map(d => d.key + (d.required ? ' (required)' : '')).join(', ');
        const ch = document.createElement('p');
        ch.innerHTML = `<strong>Dependencies:</strong> ${depsText}`;
        item.appendChild(ch);
      }
      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-sm btn-primary mr-2';
      btnEdit.textContent = 'Edit';
      btnEdit.onclick = () => openEditForm(rule.id);
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn btn-sm btn-danger';
      btnDelete.textContent = 'Delete';
      btnDelete.onclick = () => deleteRule(rule.id);
      item.appendChild(btnEdit);
      item.appendChild(btnDelete);
      // Details panel: show full rule info
      const details = document.createElement('div');
      details.className = 'rule-details pl-3';
      details.style.display = 'none';
      // Build details content
      const table = document.createElement('table');
      table.className = 'table table-sm';
      const thead = document.createElement('thead');
      thead.innerHTML = '<tr><th>Field</th><th>Value</th></tr>';
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      // Path
      const trPath = document.createElement('tr');
      trPath.innerHTML = `<td>Path</td><td>${rule.path || ''}</td>`;
      tbody.appendChild(trPath);
      // Description
      const trDesc = document.createElement('tr');
      trDesc.innerHTML = `<td>Description</td><td>${rule.description || ''}</td>`;
      tbody.appendChild(trDesc);
      // Conditions
      const trConds = document.createElement('tr');
      const condList = rule.conditions.map(c => `${c.extractor} ${c.type}${c.value ? ' '+c.value : ''}`).join('<br>');
      trConds.innerHTML = `<td>Conditions</td><td>${condList}</td>`;
      tbody.appendChild(trConds);
      // Dependencies
      const trDeps = document.createElement('tr');
      const depsList = (rule.dependencies||[]).map(d => d.key + (d.required? ' (required)': '')).join('<br>');
      trDeps.innerHTML = `<td>Dependencies</td><td>${depsList}</td>`;
      tbody.appendChild(trDeps);
      // Messages
      const trPass = document.createElement('tr');
      trPass.innerHTML = `<td>Pass Message</td><td>${rule.pass_msg||''}</td>`;
      tbody.appendChild(trPass);
      const trFail = document.createElement('tr');
      trFail.innerHTML = `<td>Fail Message</td><td>${rule.fail_msg||''}</td>`;
      tbody.appendChild(trFail);
      table.appendChild(tbody);
      details.appendChild(table);
      item.appendChild(details);
      // Attach toggle to header
      attachToggle(header, item, '.rule-details');
      listEl.appendChild(item);
    });
  } catch (e) {
    console.error('Failed to load rules', e);
  }
}

/**
 * Delete a rule and update storage
 */
async function deleteRule(id) {
  if (!confirm('Delete rule ' + id + '?')) return;
  currentRules = currentRules.filter(r => r.id !== id);
  await window.api.setRules(currentRules);
  reloadRules();
}

/**
 * Populate dependencies list from dimensions definitions
 */
export async function populateDependenciesList(selected = []) {
  const dims = await window.api.getDimensions();
  const container = document.getElementById('newRuleDependencies');
  const search = document.getElementById('depSearch');
  container.innerHTML = '';
  dims.forEach(dim => {
    const row = document.createElement('div');
    row.className = 'dependency-row form-inline mb-1';
    row.dataset.key = dim.key;
    const chk = document.createElement('input'); chk.type = 'checkbox'; chk.className = 'dep-include mr-2';
    const sel = selected.find(d => d.key === dim.key);
    chk.checked = sel ? true : false;
    const label = document.createElement('label'); label.textContent = dim.key; label.className = 'mr-3';
    const chkReq = document.createElement('input'); chkReq.type = 'checkbox'; chkReq.className = 'dep-required mr-2';
    chkReq.checked = sel ? Boolean(sel.required) : false;
    const labelReq = document.createElement('label'); labelReq.textContent = 'Required';
    row.append(chk, label, chkReq, labelReq);
    container.appendChild(row);
  });
  if (search) {
    search.oninput = () => {
      const term = search.value.toLowerCase();
      container.querySelectorAll('.dependency-row').forEach(row => {
        row.style.display = row.dataset.key.toLowerCase().includes(term) ? '' : 'none';
      });
    };
  }
}

/**
 * Clear and reset the rule form
 */
function clearForm() {
  editingRuleId = null;
  document.getElementById('newRuleName').value = '';
  document.getElementById('newRuleDomain').value = '';
  document.getElementById('newRuleMethod').value = 'GET';
  document.getElementById('newRuleDesc').value = '';
  document.getElementById('conditionsContainer').innerHTML = '';
  document.getElementById('cancelEditRule').style.display = 'none';
  document.getElementById('saveNewRule').textContent = 'Add Event';
  document.getElementById('depSearch').value = '';
  document.getElementById('newRuleDependencies').innerHTML = '';
}

/**
 * Open form for editing existing rule
 */
function openEditForm(id) {
  const rule = currentRules.find(r => r.id === id);
  if (!rule) return;
  editingRuleId = id;
  document.getElementById('newRuleName').value = rule.name || '';
  document.getElementById('newRuleDomain').value = rule.domain;
  document.getElementById('newRuleMethod').value = rule.method;
  document.getElementById('newRuleDesc').value = rule.description || '';
  document.getElementById('saveNewRule').textContent = 'Update Event';
  document.getElementById('cancelEditRule').style.display = 'inline-block';
  const condContainer = document.getElementById('conditionsContainer');
  condContainer.innerHTML = '';
  rule.conditions.forEach(c => condContainer.appendChild(createConditionRow(c)));
  populateDependenciesList(rule.dependencies || []);
  document.getElementById('addRuleForm').style.display = 'block';
}

/**
 * Generate unique id from name
 */
function generateId(name) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return slug + '_' + Date.now();
}

/**
 * Create a new condition row element
 */
function createConditionRow(c = { extractor: '', type: 'equals', value: '' }) {
  // implementation: same as original renderer.js createConditionRow
  const row = document.createElement('div');
  row.className = 'condition-row form-row mb-2';
  const [src, ...pathParts] = c.extractor.split('.');
  const path = pathParts.join('.');
  row.innerHTML = `
    <select class="condition-source form-control col-2 mr-2">
      <option ${src==='query'?'selected':''}>query</option>
      <option ${src==='form'?'selected':''}>form</option>
      <option ${src==='json'?'selected':''}>json</option>
      <option ${src==='body'?'selected':''}>body</option>
    </select>
    <input class="condition-path form-control col-3 mr-2" value="${path}" placeholder="field" />
    <select class="condition-type form-control col-2 mr-2">
      <option value="exists" ${c.type==='exists'?'selected':''}>exists</option>
      <option value="equals" ${c.type==='equals'?'selected':''}>equals</option>
      <option value="in" ${c.type==='in'?'selected':''}>in</option>
      <option value="regex" ${c.type==='regex'?'selected':''}>regex</option>
      <option value="uuid" ${c.type==='uuid'?'selected':''}>uuid</option>
    </select>
    <input class="condition-value form-control col-3 mr-2" value="${c.value||''}" placeholder="value" />
    <button class="btn btn-sm btn-outline-danger remove-condition">X</button>
  `;
  row.querySelector('.remove-condition').onclick = () => row.remove();
  return row;
}

/**
 * Open rule creation form prefilled from a flow
 */
export function openCreateRuleFromFlow(item) {
  editingRuleId = null;
  clearForm();
  populateDependenciesList();
  const flow = item.flow;
  document.getElementById('newRuleName').value = `${flow.request.host}_${flow.request.path}`;
  document.getElementById('newRuleDomain').value = flow.request.host;
  document.getElementById('newRuleMethod').value = flow.request.method;
  const container = document.getElementById('conditionsContainer');
  container.innerHTML = '';
  Object.entries(flow.request.query||{}).forEach(([k,v]) => container.appendChild(createConditionRow({ extractor: `query.${k}`, type: 'equals', value: v })));
  Object.entries(flow.request.form||{}).forEach(([k,v]) => container.appendChild(createConditionRow({ extractor: `form.${k}`, type: 'equals', value: v })));
  if (flow.request.json && typeof flow.request.json==='object') Object.entries(flow.request.json).forEach(([k,v]) => container.appendChild(createConditionRow({ extractor: `json.${k}`, type: 'equals', value: v })));
  document.getElementById('addRuleForm').style.display = 'block';
}

/**
 * Save or update rule from form
 */
async function saveNewRule() {
  const name = document.getElementById('newRuleName').value.trim();
  const domain = document.getElementById('newRuleDomain').value.trim();
  const method = document.getElementById('newRuleMethod').value;
  if (!name || !domain) return alert('Name and domain are required');
  const conditionRows = document.querySelectorAll('#conditionsContainer .condition-row');
  const conditions = [];
  for (const row of conditionRows) {
    const src = row.querySelector('.condition-source').value;
    const p = row.querySelector('.condition-path').value.trim();
    const type = row.querySelector('.condition-type').value;
    const val = row.querySelector('.condition-value').value;
    if (!p) return alert('Each condition must have a path');
    const extractor = `${src}.${p}`;
    if (type === 'exists') conditions.push({ extractor, type });
    else {
      if (!val) return alert(`Condition value required for type ${type}`);
      conditions.push({ extractor, type, value: val });
    }
  }
  const deps = [];
  document.querySelectorAll('#newRuleDependencies .dependency-row').forEach(row => {
    const key = row.dataset.key;
    const include = row.querySelector('.dep-include').checked;
    const required = row.querySelector('.dep-required').checked;
    if (include) deps.push({ key, required });
  });
  const pathVal = document.getElementById('newRulePath').value.trim();
  const desc = document.getElementById('newRuleDesc').value.trim();
  const passMsg = document.getElementById('newRulePass').value.trim();
  const failMsg = document.getElementById('newRuleFail').value.trim();
  let id = editingRuleId || generateId(name);
  const newRule = { id, name, domain, method, path: pathVal, conditions, dependencies: deps, description: desc, pass_msg: passMsg, fail_msg: failMsg };
  if (editingRuleId) currentRules = currentRules.map(r => r.id === id ? newRule : r);
  else currentRules.push(newRule);
  await window.api.setRules(currentRules);
  reloadRules();
  clearForm();
}

/**
 * Initialize events panel controls and expose functions globally
 */
export function initEvents() {
  window.reloadRules = reloadRules;
  window.openCreateRuleFromFlow = openCreateRuleFromFlow;
  window.openEditForm = openEditForm;
  const addCond = document.getElementById('addCondition');
  if (addCond) addCond.addEventListener('click', () => document.getElementById('conditionsContainer').appendChild(createConditionRow()));
  const showAdd = document.getElementById('showAddRuleForm');
  if (showAdd) showAdd.onclick = () => {
    clearForm();
    document.getElementById('addRuleForm').style.display = 'block';
    populateDependenciesList();
  };
  const reloadBtn = document.getElementById('reloadRulesList');
  if (reloadBtn) reloadBtn.onclick = () => reloadRules();
  const cancelBtn = document.getElementById('cancelEditRule');
  if (cancelBtn) cancelBtn.onclick = () => document.getElementById('addRuleForm').style.display = 'none';
  const saveBtn = document.getElementById('saveNewRule');
  if (saveBtn) saveBtn.onclick = () => saveNewRule();
}
window.addEventListener('DOMContentLoaded', initEvents);