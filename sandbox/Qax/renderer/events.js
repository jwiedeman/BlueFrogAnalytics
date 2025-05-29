import { attachToggle } from './common.js';
// Electron IPC APIs
const { getRules, getRuleContent, saveRule, createRule, deleteRule, getDimensions } = window.electronAPI;
// Rule builder panel logic from Specsavers
let currentRules = [];
let editingRuleId = null;
let selectedRuleFile = null;
// Helper to build a condition row element
function createConditionRow(c = { extractor: '', type: 'equals', value: '' }) {
  // parse extractor into source and path
  const [src, ...pathParts] = (c.extractor || '').split('.');
  const path = pathParts.join('.');
  const row = document.createElement('div');
  row.className = 'condition-row form-row mb-2';
  row.innerHTML = `
    <select class="condition-source form-control col-2 mr-2">
      <option value="query" ${src==='query'?'selected':''}>query</option>
      <option value="form" ${src==='form'?'selected':''}>form</option>
      <option value="json" ${src==='json'?'selected':''}>json</option>
      <option value="body" ${src==='body'?'selected':''}>body</option>
      <option value="header" ${src==='header'?'selected':''}>header</option>
    </select>
    <input class="condition-path form-control col-3 mr-2" type="text" value="${path}" placeholder="field" />
    <select class="condition-type form-control col-2 mr-2">
      <option value="exists" ${c.type==='exists'?'selected':''}>exists</option>
      <option value="equals" ${c.type==='equals'?'selected':''}>equals</option>
      <option value="in" ${c.type==='in'?'selected':''}>in</option>
      <option value="contains" ${c.type==='contains'?'selected':''}>contains</option>
      <option value="regex" ${c.type==='regex'?'selected':''}>regex</option>
      <option value="uuid" ${c.type==='uuid'?'selected':''}>uuid</option>
    </select>
    <input class="condition-value form-control col-3 mr-2" type="text" value="${c.value||''}" placeholder="value" />
    <button class="btn btn-sm btn-outline-danger remove-condition">X</button>
  `;
  const btn = row.querySelector('.remove-condition');
  if (btn) btn.onclick = () => row.remove();
  return row;
}
/** Load rule file list */
export async function loadRulesData() {
  return await getRules();
}
/** Render rule list in UI */
export async function reloadRules() {
  try {
    const files = await getRules();
    const listEl = document.getElementById('rulesList');
    listEl.innerHTML = '';
    currentRules = files;
    // Create list items showing each rule's friendly name (from metadata) or file base name
    for (const file of files) {
      const item = document.createElement('div');
      item.className = 'list-group-item';
      // Derive display name: use rule.name if defined, otherwise file name without extension
      let displayName = file.replace(/\.(ya?ml|json)$/i, '');
      try {
        const content = await getRuleContent(file);
        const obj = JSON.parse(content);
        if (obj.name) displayName = obj.name;
      } catch (e) {
        // ignore parse errors, use file name
      }
      item.textContent = displayName;
      item.dataset.file = file;
      item.onclick = () => {
        // Mark selected file and enable Edit button
        selectedRuleFile = file;
        const editBtn = document.getElementById('editRuleBtn');
        if (editBtn) editBtn.disabled = false;
        document.querySelectorAll('#rulesList .list-group-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');
      };
      listEl.appendChild(item);
    }
    // Auto-select first
    if (files.length) listEl.firstChild.click();
  } catch (e) {
    console.error('Failed to load rules', e);
  }
}

// Expose reload function globally for nav binding
window.reloadRules = reloadRules;
/** Populate dependencies (dimensions) */
export async function populateDependenciesList(selected = []) {
  const dims = await getDimensions();
  const container = document.getElementById('newRuleDependencies');
  const search = document.getElementById('depSearch');
  container.innerHTML = '';
  dims.forEach(dim => {
    const row = document.createElement('div'); row.className = 'dependency-row'; row.dataset.key = dim;
    const chk = document.createElement('input'); chk.type='checkbox'; chk.checked = selected.includes(dim);
    const lbl = document.createElement('label'); lbl.textContent = dim; lbl.style.marginLeft='4px';
    row.append(chk, lbl);
    container.appendChild(row);
  });
  if (search) {
    search.oninput = () => {
      const term = search.value.toLowerCase();
      container.querySelectorAll('.dependency-row').forEach(r => {
        r.style.display = r.dataset.key.toLowerCase().includes(term) ? '' : 'none';
      });
    };
  }
}
/** Open builder for new or existing rule */
export async function editRule(file) {
  editingRuleId = file;
  // Switch to rule editor panel
  document.getElementById('content-rules').style.display = 'none';
  document.getElementById('content-rule-editor').style.display = 'block';
  document.getElementById('saveNewRule').textContent = 'Save Rule';
  // load content
  const txt = await getRuleContent(file);
  try {
    const rule = JSON.parse(txt);
    document.getElementById('newRuleName').value = rule.name || '';
    document.getElementById('newRuleDomain').value = rule.domain || '';
    document.getElementById('newRuleMethod').value = rule.method || 'GET';
    document.getElementById('newRulePath').value = rule.path || '';
    document.getElementById('newRuleDesc').value = rule.description || '';
    document.getElementById('newRulePass').value = rule.pass_msg || '';
    document.getElementById('newRuleFail').value = rule.fail_msg || '';
    // set condition operator (AND/OR)
    if (rule.conditionOperator) {
      const opEl = document.getElementById('newRuleCondOp');
      if (opEl) opEl.value = rule.conditionOperator;
    }
    // populate existing conditions
    const condContainer = document.getElementById('conditionsContainer');
    if (condContainer) {
      condContainer.innerHTML = '';
      (rule.conditions || []).forEach(c => condContainer.appendChild(createConditionRow(c)));
    }
    // populate dependencies list
    await populateDependenciesList(rule.dependencies || []);
  } catch {}
}
/** Clear builder form */
function clearForm() {
  editingRuleId = null;
  ['newRuleName','newRuleDomain','newRulePath','newRuleDesc','newRulePass','newRuleFail','depSearch','newRuleCondOp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'newRuleCondOp' ? 'and' : '';
  });
  // reset conditions and dependencies lists
  const condContainer = document.getElementById('conditionsContainer');
  if (condContainer) condContainer.innerHTML = '';
  populateDependenciesList();
  // Reset save button label
  document.getElementById('saveNewRule').textContent='Add Rule';
}
/** Save rule from form */
export async function saveRuleFromForm() {
  const name = document.getElementById('newRuleName').value;
  const file = editingRuleId || `${name}.json`;
  // assemble rule object from form
  const rule = {
    name,
    domain: document.getElementById('newRuleDomain').value,
    method: document.getElementById('newRuleMethod').value,
    path: document.getElementById('newRulePath').value,
    description: document.getElementById('newRuleDesc').value,
    pass_msg: document.getElementById('newRulePass').value,
    fail_msg: document.getElementById('newRuleFail').value
  };
  // Combine condition results (AND/OR)
  const condOpEl = document.getElementById('newRuleCondOp');
  if (condOpEl) rule.conditionOperator = condOpEl.value;
  // collect conditions
  const condEls = document.querySelectorAll('#conditionsContainer .condition-row');
  rule.conditions = Array.from(condEls).map(row => {
    const src = row.querySelector('.condition-source').value;
    const p = row.querySelector('.condition-path').value.trim();
    const type = row.querySelector('.condition-type').value;
    const val = row.querySelector('.condition-value').value;
    const extractor = `${src}.${p}`;
    return type === 'exists' ? { extractor, type } : { extractor, type, value: val };
  });
  // collect dependencies
  const depEls = document.querySelectorAll('#newRuleDependencies .dependency-row');
  rule.dependencies = Array.from(depEls)
    .filter(r => r.querySelector('input[type="checkbox"]').checked)
    .map(r => r.dataset.key);
  await saveRule(file, JSON.stringify(rule, null, 2));
  clearForm();
  reloadRules();
}
/** Initialize builder UI */
export function initRuleBuilder() {
  const contentRules = document.getElementById('content-rules');
  const contentRuleEditor = document.getElementById('content-rule-editor');
  // Show editor for new rule
  document.getElementById('showAddRuleForm').onclick = () => {
    clearForm();
    contentRules.style.display = 'none';
    contentRuleEditor.style.display = 'block';
  };
  // Reload list
  document.getElementById('reloadRulesList').onclick = reloadRules;
  // Add condition rows in editor
  const addCondBtn = document.getElementById('addCondition');
  if (addCondBtn) addCondBtn.onclick = () => {
    const c = createConditionRow();
    document.getElementById('conditionsContainer').appendChild(c);
  };
  // Save rule and return to list
  document.getElementById('saveNewRule').onclick = async () => {
    await saveRuleFromForm();
    contentRuleEditor.style.display = 'none';
    contentRules.style.display = 'block';
  };
  // Cancel edit and return to list
  document.getElementById('cancelRuleBtn').onclick = () => {
    contentRuleEditor.style.display = 'none';
    contentRules.style.display = 'block';
  };
  // Edit selected rule
  const editBtn = document.getElementById('editRuleBtn');
  if (editBtn) {
    editBtn.onclick = () => {
      if (selectedRuleFile) {
        clearForm();
        contentRules.style.display = 'none';
        contentRuleEditor.style.display = 'block';
        editRule(selectedRuleFile);
      }
    };
    editBtn.disabled = true;
  }
  // Initial load
  reloadRules();
}
// Auto-run on DOM ready
window.addEventListener('DOMContentLoaded', initRuleBuilder);