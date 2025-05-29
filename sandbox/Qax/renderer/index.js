// Import Rule Builder UI logic
import { initRuleBuilder, reloadRules } from './events.js';

// Initialize Rule Builder once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  initRuleBuilder();
});
// Initialization of default view (other tabs)
const { runScenario, onLog,
        getScenarios, createScenario, openScenario, deleteScenario,
        // Flow management APIs
        getFlows, openFlow, getFlowContent, saveFlow, createFlow, deleteFlow,
        // Past runs group APIs
        getPastRunGroups, openScreenshot, deletePastRunGroup,
        // Utility API
        getLogsDir,
        // Multi-run APIs
        startMultiRun, listActiveRuns, cancelRun, onRunProgress, onRunComplete,
        // Rule results API
        onRuleResults,
        // Scenario editor APIs
        getScenarioContent, saveScenario,
        // Swarm presets APIs
        getSwarms, getSwarmContent, saveSwarm, deleteSwarm,
        // Rule management APIs
        getRules, getRuleContent, saveRule, createRule, deleteRule, openRule,
        // Dimension management APIs
        getDimensions, getDimensionContent, saveDimension, createDimension, deleteDimension, openDimension,
        // HAR processing APIs
        evaluateHar, getPastRuns, getHarContent } = window.electronAPI;
// Track expanded run groups to preserve state across refreshes
const expandedGroups = new Set();
// Editor mode: 'scenario' or 'flow'
let editorMode = 'scenario';
// User Agent presets mapping
const uaMap = {
  screamingFrog: 'Mozilla/5.0 (compatible; Screaming Frog SEO Spider/17.0; +http://www.screamingfrog.co.uk/spider.html)',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:116.0) Gecko/20100101 Firefox/116.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
  opera: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 OPR/103.0.0.0'
};

// Navigation items
const navScenarios = document.getElementById('nav-scenarios');
const navFlows = document.getElementById('nav-flows');
const navRules = document.getElementById('nav-rules');
const navDimensions = document.getElementById('nav-dimensions');
const navRuns = document.getElementById('nav-runs');         // Active runs
const navPastRuns = document.getElementById('nav-past-runs'); // Past runs
const navQA = document.getElementById('nav-qa');             // QA tab
const navSwarms = document.getElementById('nav-swarms');
const navAbout = document.getElementById('nav-about');

// Content sections
const contentScenarios = document.getElementById('content-scenarios');
const contentFlows = document.getElementById('content-flows');
const contentRules = document.getElementById('content-rules');
const contentDimensions = document.getElementById('content-dimensions');
const contentRuns = document.getElementById('content-runs');           // Active runs section
const contentPastRuns = document.getElementById('content-past-runs');   // Past runs section
const contentQA = document.getElementById('content-qa');               // QA section
const contentSwarms = document.getElementById('content-swarms');
const contentAbout = document.getElementById('content-about');
// Rule editor section
const contentRuleEditor = document.getElementById('content-rule-editor');
// Flow editor/view pane
// Buttons and list for Flows
const newFlowBtn = document.getElementById('newFlowBtn');
const editFlowBtn = document.getElementById('editFlowBtn');
const deleteFlowBtn = document.getElementById('deleteFlowBtn');
const runFlowBtn = document.getElementById('runFlowBtn');
// Selected flow file
let selectedFlow = null;
// Rule management controls
const newRuleBtn = document.getElementById('newRuleBtn');
const editRuleBtn = document.getElementById('editRuleBtn');
const deleteRuleBtn = document.getElementById('deleteRuleBtn');
let selectedRule = null;
// Dimension management controls
const newDimensionBtn = document.getElementById('newDimensionBtn');
const editDimensionBtn = document.getElementById('editDimensionBtn');
const deleteDimensionBtn = document.getElementById('deleteDimensionBtn');
let selectedDimension = null;
// Scenario editor pane
const contentEditor = document.getElementById('content-editor');

const runBtn = document.getElementById('runBtn');
const newScenarioBtn = document.getElementById('newScenarioBtn');
const editScenarioBtn = document.getElementById('editScenarioBtn');
const deleteScenarioBtn = document.getElementById('deleteScenarioBtn');
const runsList = document.getElementById('runsList');
const logArea = document.getElementById('logArea');
// Section for displaying logs or HAR content
const logSection = document.getElementById('log-section');
// Multi-run UI elements
const workerCount = document.getElementById('workerCount');
const activeWorkersList = document.getElementById('activeWorkersList');
// Container for per-worker settings
const workerSettingsContainer = document.getElementById('workerSettingsContainer');
// Track per-worker progress (step counts)
const progressData = {};
// Run-tab swarm controls
const runSwarmSelect = document.getElementById('runSwarmSelect');
// Swarm preset UI elements
const swarmSelect = document.getElementById('swarmSelect');
const applySwarmBtn = document.getElementById('applySwarmBtn');
const newSwarmBtn = document.getElementById('newSwarmBtn');
const deleteSwarmBtn = document.getElementById('deleteSwarmBtn');
// Definitions for scenario steps (used in Scenario editor)
const scenarioStepDefinitions = [
  { id: 'navigate', label: 'Navigate to URL', params: [{ name: 'url', label: 'URL', type: 'text' }] },
  { id: 'click', label: 'Click Element', params: [{ name: 'selector', label: 'Selector', type: 'text' }] },
  { id: 'fill', label: 'Fill Input', params: [
      { name: 'selector', label: 'Selector', type: 'text' },
      { name: 'text', label: 'Text', type: 'text' }
    ]
  },
  { id: 'selectOption', label: 'Select Option', params: [
      { name: 'selector', label: 'Selector', type: 'text' },
      { name: 'value', label: 'Value', type: 'text' }
    ]
  },
  { id: 'check', label: 'Check Checkbox', params: [{ name: 'selector', label: 'Selector', type: 'text' }] },
  { id: 'uncheck', label: 'Uncheck Checkbox', params: [{ name: 'selector', label: 'Selector', type: 'text' }] },
  { id: 'hover', label: 'Hover Element', params: [{ name: 'selector', label: 'Selector', type: 'text' }] },
  { id: 'press', label: 'Press Key', params: [{ name: 'key', label: 'Key', type: 'text' }] },
  { id: 'wait', label: 'Wait Timeout', params: [{ name: 'seconds', label: 'Seconds', type: 'number' }] },
  { id: 'waitForSelector', label: 'Wait For Selector', params: [{ name: 'selector', label: 'Selector', type: 'text' }] },
  { id: 'reload', label: 'Reload Page', params: [] },
  { id: 'back', label: 'Navigate Back', params: [] },
  { id: 'forward', label: 'Navigate Forward', params: [] },
  { id: 'screenshot', label: 'Take Screenshot', params: [] },
  // Conditional wait: proceed whether selector appears within timeout
  { id: 'ifSelector', label: 'Conditional Wait', params: [
      { name: 'selector', label: 'Selector', type: 'text' },
      { name: 'timeout', label: 'Timeout (s)', type: 'number' }
    ]
  }
];
// Definitions for flow DSL steps (used in Flows editor)
const flowStepDefinitions = [
  { id: 'goto', label: 'Go To URL', params: [{ name: 'url', label: 'URL', type: 'text' }] },
  { id: 'click', label: 'Click Selector', params: [{ name: 'selector', label: 'Selector', type: 'text' }] },
  { id: 'type', label: 'Type Text', params: [
      { name: 'selector', label: 'Selector', type: 'text' },
      { name: 'text', label: 'Text', type: 'text' }
    ]
  },
  { id: 'wait', label: 'Wait Seconds', params: [{ name: 'seconds', label: 'Seconds', type: 'number' }] },
  { id: 'wait_for_selector', label: 'Wait For Selector', params: [{ name: 'selector', label: 'Selector', type: 'text' }] },
  { id: 'assert_request', label: 'Assert Request', params: [{ name: 'substring', label: 'Substring', type: 'text' }] },
  { id: 'screenshot', label: 'Take Screenshot', params: [{ name: 'path', label: 'Path', type: 'text' }] }
];
// Enable Run button only when scenario and swarm selected
// Enable/disable scenario controls based on selection and swarm
function updateScenarioControls() {
  const hasScenario = !!selectedScenario;
  editScenarioBtn.disabled = !hasScenario;
  deleteScenarioBtn.disabled = !hasScenario;
  // Enable Run if scenario and swarm selected
  const hasSwarm = !!runSwarmSelect.value && runSwarmSelect.value !== '(no swarms saved)';
  runBtn.disabled = !(hasScenario && hasSwarm);
}
/**
 * Compute colspan based on table header columns
 */
function getColspanForRow(row) {
  const table = row.closest('table');
  if (!table) return row.children.length;
  const ths = table.querySelectorAll('thead tr th, thead tr td');
  return ths.length || row.children.length;
}
/**
 * Toggle detailed view for a clicked URL cell using callsMap
 */
function toggleCallDetails(td, callsMap) {
  const url = td.dataset.url;
  const row = td.closest('tr');
  // Detect if clicked inside a summary Rule Details table (first header cell 'Rule')
  const parentTable = row.closest('table');
  const firstTh = parentTable && parentTable.querySelector('thead th');
  const clickedRuleId = firstTh && firstTh.textContent.trim() === 'Rule'
    ? row.children[0].textContent.trim()
    : null;
  // Remove existing details if shown
  if (row.nextElementSibling && row.nextElementSibling.classList.contains('call-details-row')) {
    row.nextElementSibling.remove();
    return;
  }
  const colspan = getColspanForRow(row);
  const detailsRow = document.createElement('tr');
  detailsRow.className = 'call-details-row';
  const cell = document.createElement('td'); cell.colSpan = colspan;
  const cmRaw = callsMap[url] || { dimensions: {}, rules: [], entry: null };
  // If a specific rule was clicked in summary, limit to that rule only
  const cm = {
    dimensions: cmRaw.dimensions,
    rules: clickedRuleId ? (cmRaw.rules || []).filter(r => String(r.ruleId) === clickedRuleId) : cmRaw.rules,
    entry: cmRaw.entry
  };
  const container = document.createElement('div');
  // allow horizontal scrolling for inner QA detail tables
  container.style.width = '100%';
  container.style.minWidth = '0';
  container.style.overflowX = 'auto';
  // ---- Request & Response Metadata ----
  // Request Headers
  const hReqHeaders = document.createElement('h6'); hReqHeaders.textContent = 'Request Headers'; container.appendChild(hReqHeaders);
  if (cm.entry && cm.entry.request && Array.isArray(cm.entry.request.headers)) {
    const reqHeadTable = document.createElement('table');
    reqHeadTable.className = 'table table-sm table-striped qa-scroll-table';
    reqHeadTable.style.tableLayout = 'fixed'; reqHeadTable.style.width = '100%';
    const reqHeadHead = document.createElement('thead');
    reqHeadHead.innerHTML = '<tr><th class="extractor-col">Header</th><th class="value-col">Value</th></tr>';
    reqHeadTable.appendChild(reqHeadHead);
    const reqHeadBody = document.createElement('tbody');
    cm.entry.request.headers.forEach(h => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="extractor-col">${h.name}</td><td class="value-col" title="${h.value}">${h.value}</td>`;
      reqHeadBody.appendChild(tr);
    });
    reqHeadTable.appendChild(reqHeadBody);
    container.appendChild(reqHeadTable);
  }
  // Request Body
  if (cm.entry && cm.entry.request && cm.entry.request.postData && typeof cm.entry.request.postData.text === 'string') {
    const hReqBody = document.createElement('h6'); hReqBody.textContent = 'Request Body'; container.appendChild(hReqBody);
    const preReqBody = document.createElement('pre');
    preReqBody.style = 'background:#f9f9f9;border:1px solid #ddd;padding:8px;white-space:pre-wrap;word-break:break-all;max-width:100%;overflow:auto;';
    preReqBody.textContent = cm.entry.request.postData.text;
    container.appendChild(preReqBody);
  }
  // Response Headers
  if (cm.entry && cm.entry.response && Array.isArray(cm.entry.response.headers)) {
    const hResHeaders = document.createElement('h6'); hResHeaders.textContent = 'Response Headers'; container.appendChild(hResHeaders);
    const resHeadTable = document.createElement('table');
    resHeadTable.className = 'table table-sm table-striped qa-scroll-table';
    resHeadTable.style.tableLayout = 'fixed'; resHeadTable.style.width = '100%';
    const resHeadHead = document.createElement('thead');
    resHeadHead.innerHTML = '<tr><th class="extractor-col">Header</th><th class="value-col">Value</th></tr>';
    resHeadTable.appendChild(resHeadHead);
    const resHeadBody = document.createElement('tbody');
    cm.entry.response.headers.forEach(h => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="extractor-col">${h.name}</td><td class="value-col" title="${h.value}">${h.value}</td>`;
      resHeadBody.appendChild(tr);
    });
    resHeadTable.appendChild(resHeadBody);
    container.appendChild(resHeadTable);
  }
  // Response Body
  if (cm.entry && cm.entry.response && cm.entry.response.content && typeof cm.entry.response.content.text === 'string') {
    const hResBody = document.createElement('h6'); hResBody.textContent = 'Response Body'; container.appendChild(hResBody);
    const preResBody = document.createElement('pre');
    preResBody.style = 'background:#f9f9f9;border:1px solid #ddd;padding:8px;white-space:pre-wrap;word-break:break-all;max-width:100%;overflow:auto;';
    preResBody.textContent = cm.entry.response.content.text;
    container.appendChild(preResBody);
  }
  // Show rule details for this call
  if (cm.rules && cm.rules.length) {
    const hRules = document.createElement('h6'); hRules.textContent = 'Rule Details';
    container.appendChild(hRules);
    const ruleTable = document.createElement('table');
    ruleTable.className = 'table table-sm table-striped';
    ruleTable.style.tableLayout = 'fixed';
    ruleTable.style.width = '100%';
    const rHead = document.createElement('thead');
    rHead.innerHTML = '<tr>' +
      '<th>Rule</th>' +
      '<th class="call-url-col">Request URL</th>' +
      '<th class="extractor-col">Extractor</th>' +
      '<th class="value-col">Value</th>' +
      '<th class="expected-col">Expected</th>' +
      '<th>Passed</th>' +
    '</tr>';
    ruleTable.appendChild(rHead);
    const rBody = document.createElement('tbody');
    cm.rules.forEach(rh => {
      (rh.condResults || []).forEach(cr => {
        const tr = document.createElement('tr');
        tr.className = cr.passed ? 'table-success' : 'table-danger';
        tr.innerHTML = `
          <td>${rh.ruleId}</td>
          <td class="call-url">${url}</td>
          <td class="extractor-col">${cr.extractor}</td>
          <td class="value-col">${cr.value != null ? cr.value : ''}</td>
          <td class="expected-col">${cr.expected != null ? cr.expected : ''}</td>
          <td>${cr.passed ? '✔️' : '❌'}</td>
        `;
        rBody.appendChild(tr);
      });
    });
    ruleTable.appendChild(rBody);
    // Wrap Rule Details table to prevent horizontal overflow
    const rulesWrapper = document.createElement('div');
    rulesWrapper.style.maxWidth = '100%';
    rulesWrapper.style.minWidth = '0';
    rulesWrapper.style.overflowX = 'auto';
    rulesWrapper.appendChild(ruleTable);
    container.appendChild(rulesWrapper);
  }
  // Show all hit parameters as dimensions (query params & JSON body)
  const hDims = document.createElement('h6'); hDims.textContent = 'Hit Dimensions';
  container.appendChild(hDims);
  const pdTable = document.createElement('table');
  // table scrollable for large hit-dimensions
  pdTable.className = 'table table-sm table-bordered qa-scroll-table';
  pdTable.style.tableLayout = 'fixed';
  pdTable.style.width = '100%';
  const pdHead = document.createElement('thead');
  // Truncate long keys and values
  pdHead.innerHTML = '<tr>' +
    '<th class="extractor-col">Source</th>' +
    '<th class="value-col">Key</th>' +
    '<th class="value-col">Value</th>' +
    '<th>Passed</th>' +
    '<th>Action</th>' +
  '</tr>';
  pdTable.appendChild(pdHead);
  const pdBody = document.createElement('tbody');
  // Parse query parameters from HAR entry
  const rawReq = cm.entry.request || {};
  const queryArr = Array.isArray(rawReq.queryString) ? rawReq.queryString : [];
  const query = {};
  queryArr.forEach(p => { if (p.name) query[p.name] = p.value; });
  // Parse JSON body if present
  let jsonBody = {};
  if (rawReq.postData && typeof rawReq.postData.text === 'string') {
    try { jsonBody = JSON.parse(rawReq.postData.text); } catch {}
  }
  const allKeys = new Set([...Object.keys(query), ...Object.keys(jsonBody)]);
  allKeys.forEach(key => {
    const src = key in query ? 'query' : 'json';
    const val = src === 'query' ? query[key] : jsonBody[key];
    const vStr = (val !== null && typeof val === 'object') ? JSON.stringify(val) : String(val);
    const defined = Array.isArray(callsMap._dimKeys) && callsMap._dimKeys.includes(key);
    const info = cm.dimensions[key] || {};
    const passed = defined ? !!info.passed : false;
    const tr = document.createElement('tr');
    tr.className = defined ? (passed ? 'table-success' : 'table-danger') : 'table-secondary';
    const act = defined ? '' : `<button class="btn btn-sm btn-outline-primary">Add</button>`;
    tr.innerHTML = `
      <td class="extractor-col">${src}</td>
      <td class="value-col" title="${key}">${key}</td>
      <td class="value-col" title="${vStr}">${vStr}</td>
      <td>${defined ? (passed ? '✔️' : '❌') : ''}</td>
      <td>${act}</td>
    `;
    if (!defined) {
      const btn = tr.querySelector('button');
      btn.onclick = () => {
        navDimensions.click();
        setTimeout(() => {
          openDimensionEditor(null);
          document.getElementById('editorName').value = key;
          document.getElementById('dimOperator').value = 'exists';
          document.getElementById('dimExpected').value = String(val || '');
          document.getElementById('dimDescription').value = key;
          document.getElementById('dimPassMsg').value = 'Pass if exists';
          document.getElementById('dimFailMsg').value = 'Fail if missing';
        }, 100);
      };
    }
    pdBody.appendChild(tr);
  });
  pdTable.appendChild(pdBody);
  // Wrap Hit Dimensions table to prevent horizontal overflow from stretching layout
  const pdWrapper = document.createElement('div');
  // constrain to container width and allow scrolling for overflow
  pdWrapper.style.maxWidth = '100%';
  pdWrapper.style.minWidth = '0';
  pdWrapper.style.overflowX = 'auto';
  pdWrapper.appendChild(pdTable);
  container.appendChild(pdWrapper);
  // Unmatched request keys handled in Hit Dimensions table above
  // Suggest adding rules if none applied
  if (cm.rules && cm.rules.length === 0 && cm.entry && cm.entry.request) {
      const addRuleDiv = document.createElement('div');
      addRuleDiv.style.marginBottom = '8px';
      const addRuleBtn = document.createElement('button');
      addRuleBtn.className = 'btn btn-sm btn-outline-primary mr-1';
      addRuleBtn.textContent = 'Add Rule for this URL';
      addRuleBtn.onclick = () => {
        // Navigate to Rules tab and open new rule form
        navRules.click();
        setTimeout(() => {
          document.getElementById('showAddRuleForm').click();
          // Prefill rule fields from this request
          try {
            const u = new URL(cm.entry.request.url);
            document.getElementById('newRuleDomain').value = u.hostname;
            document.getElementById('newRulePath').value = u.pathname;
          } catch {}
          document.getElementById('newRuleMethod').value = cm.entry.request.method.toUpperCase();
          document.getElementById('newRuleDesc').value = '';
          document.getElementById('newRulePass').value = '';
          document.getElementById('newRuleFail').value = '';
        }, 100);
      };
      addRuleDiv.appendChild(addRuleBtn);
      container.appendChild(addRuleDiv);
  }
  cell.appendChild(container);
  detailsRow.appendChild(cell);
  row.parentNode.insertBefore(detailsRow, row.nextElementSibling);
}
// ----- QA tab functionality -----
// References to QA UI
const qaHarSelect = document.getElementById('qaHarSelect');
const runQaBtn = document.getElementById('runQaBtn');
const qaResults = document.getElementById('qaResults');
// Load list of HAR files
async function loadQA() {
  qaResults.textContent = '';
  qaHarSelect.innerHTML = '';
  try {
    const files = await getPastRuns();
    if (!files.length) {
      const opt = document.createElement('option'); opt.text = '(no HAR files)'; opt.disabled = true;
      qaHarSelect.appendChild(opt);
    } else {
      files.forEach(f => {
        const opt = document.createElement('option'); opt.value = f; opt.text = f;
        qaHarSelect.appendChild(opt);
      });
    }
  } catch (e) {
    qaResults.textContent = 'Error loading HAR list: ' + e.message;
  }
}
// Run QA on selected HARs
// Run QA on selected HARs
runQaBtn.onclick = async () => {
  console.log('Run QA clicked');
  try {
    const selected = Array.from(qaHarSelect.selectedOptions).map(o => o.value);
  if (!selected.length) return alert('Please select at least one HAR file.');
  // Clear previous results
  qaResults.innerHTML = '';
  // Notify user of start
  const runningAlert = document.createElement('div');
  runningAlert.className = 'alert alert-info';
  runningAlert.textContent = 'Running QA...';
  qaResults.appendChild(runningAlert);
  // Process each selected HAR
    // Process each selected HAR file
    console.log('Selected HAR files:', selected);
    for (const file of selected) {
    // Container for this file's report
    const section = document.createElement('div');
    section.style.marginBottom = '20px';
    // File header
    const title = document.createElement('h4');
    title.textContent = file;
    section.appendChild(title);
    let result;
    try {
      const harText = await getHarContent(file);
      result = await evaluateHar(harText);
    } catch (err) {
      result = { error: err && err.message ? err.message : String(err) };
    }
    // Clear running message
    if (runningAlert.parentNode) runningAlert.remove();
    // Prepare call data mapping
    const callsMap = {};
    // Populate dimensions values per call
    if (Array.isArray(result.dimensions)) {
      result.dimensions.forEach(dim => {
        (dim.values || []).forEach(v => {
          const url = v.url || '';
          if (!callsMap[url]) callsMap[url] = { dimensions: {}, rules: [], entry: null };
          callsMap[url].dimensions[dim.key] = { value: v.value, passed: v.passed };
        });
      });
    }
    // Populate full HAR entries
    if (Array.isArray(result.entries)) {
      result.entries.forEach(entry => {
        const url = entry.request && entry.request.url;
        if (!callsMap[url]) callsMap[url] = { dimensions: {}, rules: [], entry: null };
        callsMap[url].entry = entry;
      });
    }
    // Populate rule match details per call
    if (Array.isArray(result.rules)) {
      result.rules.forEach(r => {
        (r.matchDetails || []).forEach(md => {
          const url = md.url || '';
          if (!callsMap[url]) callsMap[url] = { dimensions: {}, rules: [], entry: null };
          callsMap[url].rules.push({ ruleId: r.id, passed: md.passed, condResults: md.condResults });
        });
      });
    }
    // Attach global dimension and rule key lists for per-call details
    callsMap._dimKeys = Array.isArray(result.dimensions)
      ? result.dimensions.map(d => d.key)
      : [];
    callsMap._ruleIds = Array.isArray(result.rules)
      ? result.rules.map(r => r.id)
      : [];
    // Handle errors
    if (result.error) {
      const errDiv = document.createElement('div');
      errDiv.className = 'alert alert-danger';
      errDiv.textContent = `Error: ${result.error}`;
      section.appendChild(errDiv);
      qaResults.appendChild(section);
      continue;
    }
    // Dimensions summary
    if (Array.isArray(result.dimensions) && result.dimensions.length) {
      const totalEntries = result.dimensions[0].values.length;
      const dimHeader = document.createElement('h5');
      dimHeader.textContent = 'Dimensions Summary';
      section.appendChild(dimHeader);
      const sumTable = document.createElement('table');
      // Fixed layout for consistent column widths
      sumTable.style.tableLayout = 'fixed';
      sumTable.style.width = '100%';
      sumTable.className = 'table table-sm table-bordered';
      const sumHead = document.createElement('thead');
      sumHead.innerHTML = `<tr>
        <th>Key</th><th>Total</th><th>Applied</th><th>Passed</th><th>Failed</th>
        <th class="value-col">Pass Message</th><th class="value-col">Fail Message</th>
      </tr>`;
      sumTable.appendChild(sumHead);
      const sumBody = document.createElement('tbody');
      result.dimensions.forEach(dim => {
        const applied = dim.values.filter(v => v.value !== undefined).length;
        const passCount = dim.values.filter(v => v.passed).length;
        const failCount = applied - passCount;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${dim.key}</td>
          <td>${totalEntries}</td>
          <td>${applied}</td>
          <td>${passCount}</td>
          <td>${failCount}</td>
          <td class="value-col" title="${dim.pass_msg||''}">${dim.pass_msg||''}</td>
          <td class="value-col" title="${dim.fail_msg||''}">${dim.fail_msg||''}</td>
        `;
        sumBody.appendChild(tr);
      });
      sumTable.appendChild(sumBody);
      section.appendChild(sumTable);
      // Enable filtering by summary counts
      try {
        const sumRows = sumBody.querySelectorAll('tr');
        sumRows.forEach((sumRow, idx) => {
        const dim = result.dimensions[idx];
        const tds = sumRow.querySelectorAll('td');
        // [Key, Total, Applied, Passed, Failed, PassMsg, FailMsg]
        const tdTotal = tds[1];
        const tdApplied = tds[2];
        const tdPassed = tds[3];
        const tdFailed = tds[4];
        const filters = [
          { td: tdTotal, filter: 'all' },
          { td: tdApplied, filter: 'applied' },
          { td: tdPassed, filter: 'passed' },
          { td: tdFailed, filter: 'failed' }
        ];
        filters.forEach(({ td, filter }) => {
          td.style.cursor = 'pointer';
          td.title = `Show ${filter}`;
          td.addEventListener('click', () => {
            if (dimDetails.style.display === 'none') dimToggle.click();
            const detailRows = detailTable.querySelectorAll('tbody tr');
            detailRows.forEach(row => {
              row.style.display = 'table-row';
              const valText = row.children[1].textContent;
              const passText = row.children[2].textContent;
              let show = true;
              if (filter === 'applied' && valText === '') show = false;
              else if (filter === 'passed' && passText !== '✔️') show = false;
              else if (filter === 'failed' && passText !== '❌') show = false;
              row.style.display = show ? '' : 'none';
            });
            // update filter panel to this dimension
            if (typeof dimList !== 'undefined') {
              dimList.querySelectorAll('li').forEach(el => el.classList.remove('active'));
              const li = Array.from(dimList.querySelectorAll('li')).find(el => el.textContent === dim.key);
              if (li) {
                li.classList.add('active');
                renderDimHits(dim.key);
              }
            }
          });
        });
        });
      } catch (err) {
        console.error('QA dimension summary filter error', err);
      }
      // Expandable values details (as before)
      const dimToggle = document.createElement('button');
      dimToggle.className = 'btn btn-sm btn-outline-secondary mb-2';
      dimToggle.textContent = 'Show Dimension Details';
      const dimDetails = document.createElement('div');
      dimDetails.style.display = 'none';
      const detailTable = document.createElement('table');
      detailTable.className = 'table table-sm table-striped';
      detailTable.style.tableLayout = 'fixed';
      detailTable.style.width = '100%';
      detailTable.innerHTML = `
        <thead><tr><th class="call-url-col">Request URL</th><th class="value-col">Value</th><th>Passed</th></tr></thead>
        <tbody>
          ${result.dimensions.map(dim => dim.values.map(v => `
            <tr class="${v.passed?'table-success':'table-danger'}">
              <td class="call-url" data-url="${v.url||''}">${v.url||''}</td>
              <td class="value-col">${v.value!=null?v.value:''}</td>
              <td>${v.passed?'✔️':'❌'}</td>
            </tr>
          `).join('')).join('')}
        </tbody>
      `;
      // Wrap Dimension Details table to prevent horizontal overflow
      const detailWrapper = document.createElement('div');
      detailWrapper.style.maxWidth = '100%';
      detailWrapper.style.minWidth = '0';
      detailWrapper.style.overflowX = 'auto';
      detailWrapper.appendChild(detailTable);
      dimDetails.appendChild(detailWrapper);
      dimToggle.onclick = () => {
        const showing = dimDetails.style.display !== 'none';
        dimDetails.style.display = showing ? 'none' : '';
        dimToggle.textContent = showing ? 'Show Dimension Details' : 'Hide Dimension Details';
      };
      section.appendChild(dimToggle);
      section.appendChild(dimDetails);
    }
    // Rules summary
    if (Array.isArray(result.rules) && result.rules.length) {
      const totalEntries = result.dimensions && result.dimensions[0]
        ? result.dimensions[0].values.length
        : null;
      const rulHeader = document.createElement('h5');
      rulHeader.textContent = 'Rules Summary';
      section.appendChild(rulHeader);
      const sumTable = document.createElement('table');
      // Fixed layout for consistent column widths
      sumTable.style.tableLayout = 'fixed';
      sumTable.style.width = '100%';
      sumTable.className = 'table table-sm table-bordered';
      const head = document.createElement('thead');
      head.innerHTML = '<tr><th>ID</th>' +
        (totalEntries != null ? '<th>Total</th>' : '') +
        '<th>Applied</th><th>Passed</th><th>Failed</th></tr>';
      sumTable.appendChild(head);
      const body = document.createElement('tbody');
      result.rules.forEach(r => {
        const passCount = Array.isArray(r.matchDetails)
          ? r.matchDetails.filter(md => md.passed).length : 0;
        const applied = r.matchingEntriesCount || 0;
        const failCount = applied - passCount;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${r.id}</td>
          ${totalEntries != null ? `<td>${totalEntries}</td>` : ''}
          <td>${applied}</td>
          <td>${passCount}</td>
          <td>${failCount}</td>
        `;
        body.appendChild(tr);
      });
      sumTable.appendChild(body);
      section.appendChild(sumTable);
      // Enable filtering on rule summary counts (Total, Applied, Passed, Failed)
      try {
        const ruleRows = body.querySelectorAll('tr');
        ruleRows.forEach((sumRow, idx) => {
        const r = result.rules[idx];
        const tds = sumRow.querySelectorAll('td');
        const filters = [];
        let tdIndex = 1;
        // If a Total column exists, add 'all' filter
        if (totalEntries != null) {
          const tdTotal = tds[tdIndex++];
          filters.push({ td: tdTotal, filter: 'all' });
        }
        // Applied
        const tdApplied = tds[tdIndex++];
        filters.push({ td: tdApplied, filter: 'applied' });
        // Passed
        const tdPassed = tds[tdIndex++];
        filters.push({ td: tdPassed, filter: 'passed' });
        // Failed
        const tdFailed = tds[tdIndex++];
        filters.push({ td: tdFailed, filter: 'failed' });
        filters.forEach(({ td, filter }) => {
          td.style.cursor = 'pointer';
          td.title = `Show ${filter}`;
          td.addEventListener('click', () => {
            if (rulDetails.style.display === 'none') rulToggle.click();
            const detailRows = rulDetailTable.querySelectorAll('tbody tr');
            detailRows.forEach(row => {
              row.style.display = 'table-row';
              const passCell = row.children[5];
              const passText = passCell.textContent;
              let show = true;
              if (filter === 'applied') {
                show = true; // always shows
              } else if (filter === 'passed' && passText !== '✔️') {
                show = false;
              } else if (filter === 'failed' && passText !== '❌') {
                show = false;
              }
              row.style.display = show ? '' : 'none';
            });
            // update filter panel to this rule
            if (typeof ruleList !== 'undefined') {
              ruleList.querySelectorAll('li').forEach(el => el.classList.remove('active'));
              const li = Array.from(ruleList.querySelectorAll('li')).find(el => el.textContent === r.id);
              if (li) {
                li.classList.add('active');
                renderRuleHits(r.id);
              }
            }
          });
        });
        });
      } catch (err) {
        console.error('QA rule summary filter error', err);
      }
      // Toggleable detail view for rule match details
      const rulToggle = document.createElement('button');
      rulToggle.className = 'btn btn-sm btn-outline-secondary mb-2';
      rulToggle.textContent = 'Show Rule Details';
      const rulDetails = document.createElement('div');
      rulDetails.style.display = 'none';
      const rulDetailTable = document.createElement('table');
      rulDetailTable.className = 'table table-sm table-striped';
      rulDetailTable.style.tableLayout = 'fixed';
      rulDetailTable.style.width = '100%';
      rulDetailTable.innerHTML = `
        <thead>
          <tr><th>Rule</th><th class="call-url-col">Request URL</th><th class="extractor-col">Extractor</th><th class="value-col">Value</th><th class="expected-col">Expected</th><th>Passed</th></tr>
        </thead>
        <tbody>
          ${result.rules.map(r => (
            Array.isArray(r.matchDetails) ? r.matchDetails.map(md => (
              md.condResults.map(cr => `
                <tr class="${cr.passed?'table-success':'table-danger'}">
                  <td>${r.id}</td>
                  <td class="call-url" data-url="${md.url||''}">${md.url||''}</td>
                  <td class="extractor-col">${cr.extractor}</td>
                  <td class="value-col">${cr.value!=null?cr.value:''}</td>
                  <td class="expected-col">${cr.expected!=null?cr.expected:''}</td>
                  <td>${cr.passed?'✔️':'❌'}</td>
                </tr>
              `).join('')
            )) : '').join('')).join('')}
        </tbody>
      `;
      // Wrap Rule Details table to prevent horizontal overflow
      const ruleDetailWrapper = document.createElement('div');
      ruleDetailWrapper.style.maxWidth = '100%';
      ruleDetailWrapper.style.minWidth = '0';
      ruleDetailWrapper.style.overflowX = 'auto';
      ruleDetailWrapper.appendChild(rulDetailTable);
      rulDetails.appendChild(ruleDetailWrapper);
      rulToggle.onclick = () => {
        const showing = rulDetails.style.display !== 'none';
        rulDetails.style.display = showing ? 'none' : '';
        rulToggle.textContent = showing ? 'Show Rule Details' : 'Hide Rule Details';
      };
      section.appendChild(rulToggle);
      section.appendChild(rulDetails);
      // Comprehensive Hit Dimensions Matrix
      if (result.dimensions && result.dimensions.length) {
        const dimKeys = result.dimensions.map(d => d.key);
        const matTitle = document.createElement('h5'); matTitle.textContent = 'Hit Dimensions Matrix';
        section.appendChild(matTitle);
        const matTable = document.createElement('table');
        // table scrollable for large matrices
        matTable.className = 'table table-sm table-striped qa-scroll-table';
        matTable.style.tableLayout = 'fixed'; matTable.style.width = '100%';
        const matHead = document.createElement('thead');
        matHead.innerHTML = '<tr><th class="call-url-col">URL</th>' + dimKeys.map(k => `<th class="value-col">${k}</th>`).join('') + '</tr>';
        matTable.appendChild(matHead);
        const matBody = document.createElement('tbody');
        Object.keys(callsMap).forEach(url => {
          // Skip internal map keys
          if (!url || url.startsWith('_')) return;
          const tr = document.createElement('tr');
          const cells = [`<td class="call-url" title="${url}">${url}</td>`];
          dimKeys.forEach(k => {
            const info = (callsMap[url].dimensions || {})[k] || {};
            const v = info.value != null ? info.value : '';
            const passed = info.passed === true;
            const cls = passed ? 'table-success' : info.passed === false ? 'table-danger' : '';
            cells.push(`<td class="value-col ${cls}" title="${v}">${v}${passed ? ' ✔️' : ''}</td>`);
          });
          tr.innerHTML = cells.join('');
          matBody.appendChild(tr);
        });
        matTable.appendChild(matBody);
        // Wrap matrix table in a scroll container to prevent layout stretching
        const matWrapper = document.createElement('div');
        // constrain to container width and allow scrolling for overflow
        matWrapper.style.maxWidth = '100%';
        matWrapper.style.minWidth = '0';
        matWrapper.style.overflowX = 'auto';
        matWrapper.appendChild(matTable);
        section.appendChild(matWrapper);
      }
      // --- Interactive QA Filter Panel ---
      // Dimension and Rule selectors
      const filterPanel = document.createElement('div');
      // Two-column layout: dimensions list on left, rules list on right
      filterPanel.className = 'd-flex mb-3';
      filterPanel.style.gap = '20px';
      // Dimensions column
      const dimGroup = document.createElement('div');
      const dimLabel = document.createElement('span'); dimLabel.textContent = 'Dimensions:';
      const dimList = document.createElement('ul'); dimList.className = 'list-group';
      (result.dimensions || []).forEach(dim => {
        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action';
        li.textContent = dim.key;
        li.style.cursor = 'pointer';
        li.onclick = () => {
          // mark active
          dimList.querySelectorAll('li').forEach(el => el.classList.remove('active'));
          li.classList.add('active');
          renderDimHits(dim.key);
        };
        dimList.appendChild(li);
      });
      const ruleLabel = document.createElement('span'); ruleLabel.textContent = 'Rules: ';
      const ruleList = document.createElement('ul'); ruleList.className = 'list-group';
      (result.rules || []).forEach(r => {
        const li = document.createElement('li');
        li.className = 'list-group-item list-group-item-action';
        li.textContent = r.id;
        li.style.cursor = 'pointer';
        li.onclick = () => {
          // mark active
          ruleList.querySelectorAll('li').forEach(el => el.classList.remove('active'));
          li.classList.add('active');
          renderRuleHits(r.id);
        };
        ruleList.appendChild(li);
      });
      dimGroup.appendChild(dimLabel);
      dimGroup.appendChild(dimList);
      // Rules column
      const ruleGroup = document.createElement('div');
      ruleGroup.appendChild(ruleLabel);
      ruleGroup.appendChild(ruleList);

      filterPanel.appendChild(dimGroup);
      filterPanel.appendChild(ruleGroup);
      // Hits table and raw view
      const hitsTitle = document.createElement('h5'); hitsTitle.textContent = 'Hits';
      const hitsTable = document.createElement('table');
      // table auto-sizing and horizontal scroll when needed
      hitsTable.className = 'table table-sm table-striped qa-scroll-table';
      const hitsHead = document.createElement('thead');
hitsHead.innerHTML = '<tr><th class="call-url-col">Request URL</th><th class="value-col">Value</th><th>Passed</th></tr>';
      const hitsBody = document.createElement('tbody');
      hitsTable.appendChild(hitsHead);
      hitsTable.appendChild(hitsBody);
      const rawDiv = document.createElement('div'); rawDiv.style.display = 'none';
      rawDiv.innerHTML = '<h5>Raw Entry</h5>' +
        '<pre style="background:#f9f9f9;border:1px solid #ddd;padding:8px;max-height:300px;overflow:auto;white-space:pre-wrap;word-break:break-all;width:100%;"></pre>';
      // Render functions
      function renderDimHits(key) {
        hitsTitle.textContent = `Hits for dimension ${key}`;
        hitsBody.innerHTML = '';
        Object.keys(callsMap).forEach(url => {
          // Skip internal map keys
          if (!url || url.startsWith('_')) return;
          const dims = callsMap[url].dimensions || {};
          const d = dims[key];
          if (d) {
            const tr = document.createElement('tr');
            tr.className = d.passed ? 'table-success' : 'table-danger';
            tr.innerHTML = `
              <td class="call-url" data-url="${url}">${url}</td>
              <td class="value-col">${d.value != null ? d.value : ''}</td>
              <td>${d.passed ? '✔️' : '❌'}</td>
            `;
            hitsBody.appendChild(tr);
          }
        });
        rawDiv.style.display = 'none';
      }
      function renderRuleHits(id) {
        hitsTitle.textContent = `Matches for rule ${id}`;
        hitsBody.innerHTML = '';
        Object.keys(callsMap).forEach(url => {
          // Skip internal map keys
          if (!url || url.startsWith('_')) return;
          (callsMap[url].rules || []).filter(rh => rh.ruleId === id)
            .forEach(rh => rh.condResults.forEach(cr => {
              const tr = document.createElement('tr');
              tr.className = cr.passed ? 'table-success' : 'table-danger';
              tr.innerHTML = `
                <td class="call-url" data-url="${url}">${url}</td>
                <td class="value-col">${cr.value != null ? cr.value : ''}</td>
                <td>${cr.passed ? '✔️' : '❌'}</td>
              `;
              hitsBody.appendChild(tr);
            }));
        });
        rawDiv.style.display = 'none';
      }
      // Click URL for raw
      hitsTable.addEventListener('click', ev => {
        const td = ev.target.closest('td.call-url'); if (!td) return;
        const url = td.dataset.url; const ent = callsMap[url] && callsMap[url].entry;
        if (ent) {
          rawDiv.querySelector('pre').textContent = JSON.stringify(ent, null, 2);
          rawDiv.style.display = '';
        }
      });
      section.appendChild(filterPanel);
      // Auto-render first dimension hits
      if (result.dimensions && result.dimensions.length) {
        const firstKey = result.dimensions[0].key;
        const firstLi = dimList.querySelector('li');
        if (firstLi) firstLi.classList.add('active');
        renderDimHits(firstKey);
      }
      section.appendChild(hitsTitle);
      // Wrap Hits table to prevent horizontal overflow
      const hitsWrapper = document.createElement('div');
      hitsWrapper.style.maxWidth = '100%';
      hitsWrapper.style.minWidth = '0';
      hitsWrapper.style.overflowX = 'auto';
      hitsWrapper.appendChild(hitsTable);
      section.appendChild(hitsWrapper);
      // Append raw entry view
      section.appendChild(rawDiv);
    }
    // Append this file's section
    qaResults.appendChild(section);
    // Attach click handler to URL cells for details toggle
    section.querySelectorAll('td.call-url').forEach(td => {
      td.style.cursor = 'pointer';
      td.addEventListener('click', () => toggleCallDetails(td, callsMap));
    });
    }
  } catch (err) {
    console.error('Run QA error', err);
    qaResults.textContent = 'Error running QA: ' + (err.message || String(err));
  }
};
// ----------------------------------
// Update state when selections change
// Update controls when swarm selection changes
runSwarmSelect.addEventListener('change', updateScenarioControls);
// Generate per-worker settings UI
function updateWorkerSettingsUI() {
  const count = parseInt(workerCount.value, 10) || 1;
  workerSettingsContainer.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const div = document.createElement('div');
    div.className = 'workerSettings';
    div.style.border = '1px solid #ccc';
    div.style.padding = '6px';
    div.style.marginBottom = '8px';
    const title = document.createElement('strong');
    title.textContent = `Worker ${i + 1}`;
    div.appendChild(title);
    // Browser type and headless together
    const browserWrapper = document.createElement('div');
    browserWrapper.className = 'workerWrapper';
    const btLabel = document.createElement('label'); btLabel.textContent = 'Browser:';
    const btSelect = document.createElement('select');
    btSelect.className = 'browserTypeSelect';
    ['chromium', 'firefox', 'webkit'].forEach(b => {
      const opt = document.createElement('option'); opt.value = b; opt.text = b; btSelect.appendChild(opt);
    });
    const hlLabel = document.createElement('label'); hlLabel.textContent = 'Headless:';
    const hlCheckbox = document.createElement('input'); hlCheckbox.type = 'checkbox'; hlCheckbox.checked = true;
    hlCheckbox.className = 'headlessCheckbox';
    hlLabel.insertBefore(hlCheckbox, hlLabel.firstChild);
    browserWrapper.appendChild(btLabel);
    browserWrapper.appendChild(btSelect);
    browserWrapper.appendChild(hlLabel);
    div.appendChild(browserWrapper);
    // Viewport preset and manual size
    const vpWrapper = document.createElement('div'); vpWrapper.className = 'workerWrapper';
    // Preset select
    const presetLabel = document.createElement('label'); presetLabel.textContent = 'Viewport Preset:';
    const presetSelect = document.createElement('select'); presetSelect.style.marginLeft = '5px';
    presetSelect.className = 'viewportPresetSelect';
    ['Custom','Desktop (1920x1080)','Tablet (768x1024)','Mobile (375x667)'].forEach(optText => {
      const opt = document.createElement('option'); opt.value = optText; opt.text = optText; presetSelect.appendChild(opt);
    });
    vpWrapper.appendChild(presetLabel); vpWrapper.appendChild(presetSelect);
    // Manual inputs
    const vpLabel = document.createElement('label'); vpLabel.textContent = ' Size:'; vpLabel.style.marginLeft = '10px';
    const vpW = document.createElement('input'); vpW.type = 'number'; vpW.value = '1280'; vpW.style.width = '60px'; vpW.style.marginLeft = '5px';
    vpW.className = 'viewportWidthInput';
    const xText = document.createTextNode(' x ');
    const vpH = document.createElement('input'); vpH.type = 'number'; vpH.value = '720'; vpH.style.width = '60px'; vpH.style.marginLeft = '5px';
    vpH.className = 'viewportHeightInput';
    vpWrapper.appendChild(vpLabel); vpWrapper.appendChild(vpW); vpWrapper.appendChild(xText); vpWrapper.appendChild(vpH);
    // Handle preset changes
    presetSelect.onchange = () => {
      const v = presetSelect.value;
      if (v.startsWith('Desktop')) { vpW.value=1920; vpH.value=1080; }
      else if (v.startsWith('Tablet')) { vpW.value=768; vpH.value=1024; }
      else if (v.startsWith('Mobile')) { vpW.value=375; vpH.value=667; }
    };
    div.appendChild(vpWrapper);
    // User Agent preset and override
    const uaDiv = document.createElement('div');
    // user agent container
    const uaPresetLabel = document.createElement('label');
    uaPresetLabel.textContent = 'User Agent Preset:';
    const uaPresetSelect = document.createElement('select');
    uaPresetSelect.className = 'uaPresetSelect';
    uaPresetSelect.style.marginLeft = '5px';
    const uaOptions = [
      { value: 'custom', label: 'Custom' },
      { value: 'screamingFrog', label: 'Screaming Frog SEO Spider' },
      { value: 'googlebot', label: 'Googlebot' },
      { value: 'chrome', label: 'Chrome' },
      { value: 'firefox', label: 'Firefox' },
      { value: 'safari', label: 'Safari' },
      { value: 'opera', label: 'Opera' }
    ];
    uaOptions.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.text = opt.label;
      uaPresetSelect.appendChild(o);
    });
    const uaLabel = document.createElement('label');
    uaLabel.textContent = 'UA:';
    uaLabel.style.marginLeft = '10px';
    const uaInput = document.createElement('input');
    uaInput.type = 'text';
    uaInput.className = 'userAgentInput';
    uaInput.style.marginLeft = '5px';
    uaInput.style.width = '300px';
    const uaMap = {
      screamingFrog: 'Mozilla/5.0 (compatible; Screaming Frog SEO Spider/17.0; +http://www.screamingfrog.co.uk/spider.html)',
      googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
      firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:116.0) Gecko/20100101 Firefox/116.0',
      safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Safari/605.1.15',
      opera: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 OPR/103.0.0.0'
    };
    uaPresetSelect.onchange = () => {
      const preset = uaPresetSelect.value;
      if (preset !== 'custom' && uaMap[preset]) {
        uaInput.value = uaMap[preset];
        uaInput.disabled = true;
      } else {
        uaInput.value = '';
        uaInput.disabled = false;
      }
    };
    uaPresetSelect.value = 'custom';
    uaInput.disabled = false;
    uaDiv.appendChild(uaPresetLabel);
    uaDiv.appendChild(uaPresetSelect);
    uaDiv.appendChild(uaLabel);
    uaDiv.appendChild(uaInput);
    uaDiv.className = 'workerWrapper';
    div.appendChild(uaDiv);
    // HAR URL whitelist (optional comma-separated patterns)
    const wlDiv = document.createElement('div');
    const wlLabel = document.createElement('label');
    wlLabel.textContent = 'HAR URL Whitelist (comma separated):';
    const wlInput = document.createElement('input');
    wlInput.type = 'text';
    wlInput.className = 'harWhitelistInput';
    wlInput.style.marginLeft = '5px';
    wlInput.style.width = '90%';
    wlDiv.appendChild(wlLabel);
    wlDiv.appendChild(wlInput);
    wlDiv.className = 'workerWrapper';
    div.appendChild(wlDiv);
    workerSettingsContainer.appendChild(div);
  }
}
workerCount.addEventListener('input', updateWorkerSettingsUI);

// Track currently selected scenario
let selectedScenario = null;
// Load list of scenarios into a table
// Load list of scenarios into a table
/**
 * Load and render scenario list, optionally pre-select a file
 * @param {string} [preselect] - fileName to select after loading
 */
async function loadScenarios(preselect) {
  const tbody = document.getElementById('scenarioList');
  tbody.innerHTML = '';
  try {
    const files = await getScenarios();
    files.forEach(f => {
      const tr = document.createElement('tr');
      tr.dataset.file = f;
      const nameTd = document.createElement('td');
      nameTd.textContent = f.replace(/\.(ya?ml|json)$/i, '');
      tr.appendChild(nameTd);
      tr.onclick = () => {
        document.querySelectorAll('#scenarioListTable tr').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');
        selectedScenario = f;
        updateScenarioControls();
      };
      tbody.appendChild(tr);
    });
    // Auto-select the specified scenario, or default to first
    if (files.length > 0) {
      let toSelect = null;
      if (preselect) toSelect = tbody.querySelector(`tr[data-file="${preselect}"]`);
      if (!toSelect) toSelect = tbody.querySelector('tr');
      toSelect.click();
    }
  } catch (e) {
    alert('Error loading scenarios: ' + e.message);
  }
}

// Run scenario(s) using workerCount
runBtn.onclick = async () => {
  if (!selectedScenario) return;
  const swarmFile = runSwarmSelect.value;
  if (!swarmFile) { alert('Please select a swarm preset before running'); return; }
  try {
    const txt = await getSwarmContent(swarmFile);
    const settingsList = JSON.parse(txt);
    await startMultiRun(`scenarios/${selectedScenario}`, settingsList.length, settingsList);
    navRuns.click();
  } catch (e) {
    alert('Error running scenario: ' + e.message);
  }
};
// Scenario management buttons
newScenarioBtn.onclick = () => openEditor(null);
editScenarioBtn.onclick = () => {
  if (!selectedScenario) return;
  openEditor(selectedScenario);
};
deleteScenarioBtn.onclick = async () => {
  if (!selectedScenario) return;
  if (!confirm(`Delete scenario '${selectedScenario}'?`)) return;
  try {
    await deleteScenario(selectedScenario);
    await loadScenarios();
  } catch (e) {
    alert('Error deleting scenario: ' + e.message);
  }
};

// Flow management functions
async function loadFlows() {
  const tbody = document.getElementById('flowList');
  tbody.innerHTML = '';
  try {
    const files = await getFlows();
    if (files.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = '(no flows)';
      td.colSpan = 1;
      td.style.fontStyle = 'italic';
      td.style.color = '#666';
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      files.forEach(f => {
        const tr = document.createElement('tr');
        tr.dataset.file = f;
        const td = document.createElement('td');
        td.textContent = f.replace(/\.(ya?ml|json)$/i, '');
        tr.appendChild(td);
        tr.onclick = () => {
          document.querySelectorAll('#flowListTable tr').forEach(r => r.classList.remove('selected'));
          tr.classList.add('selected');
          selectedFlow = f;
          updateFlowControls();
        };
        tbody.appendChild(tr);
      });
      tbody.querySelector('tr').click();
    }
  } catch (e) {
    alert('Error loading flows: ' + e.message);
  }
}

function updateFlowControls() {
  const hasFlow = !!selectedFlow;
  editFlowBtn.disabled = !hasFlow;
  deleteFlowBtn.disabled = !hasFlow;
  runFlowBtn.disabled = !hasFlow;
}

// Open flow editor for new flow
newFlowBtn.onclick = () => {
  editorMode = 'flow';
  openFlowEditor(null);
};

// Open flow editor for existing flow
editFlowBtn.onclick = () => {
  if (!selectedFlow) return;
  editorMode = 'flow';
  openFlowEditor(selectedFlow);
};

deleteFlowBtn.onclick = async () => {
  if (!selectedFlow) return;
  if (!confirm(`Delete flow '${selectedFlow}'?`)) return;
  try {
    await deleteFlow(selectedFlow);
    selectedFlow = null;
    await loadFlows();
  } catch (e) {
    alert('Error deleting flow: ' + e.message);
  }
};

runFlowBtn.onclick = async () => {
  if (!selectedFlow) return;
  try {
    await runScenario(`flows/${selectedFlow}`);
    navRuns.click();
  } catch (e) {
    alert('Error running flow: ' + e.message);
  }
};

// Rule management functions
async function loadRules() {
  const tbody = document.getElementById('ruleList'); tbody.innerHTML = '';
  try {
    const files = await getRules();
    if (files.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.textContent = '(no rules)';
      td.colSpan = 1;
      td.style.fontStyle = 'italic';
      td.style.color = '#666';
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      files.forEach(f => {
        const tr = document.createElement('tr'); tr.dataset.file = f;
        const td = document.createElement('td'); td.textContent = f.replace(/\.(ya?ml|json)$/i, ''); tr.appendChild(td);
        tr.onclick = () => {
          document.querySelectorAll('#ruleListTable tr').forEach(r => r.classList.remove('selected'));
          tr.classList.add('selected'); selectedRule = f; updateRuleControls();
        };
        tbody.appendChild(tr);
      });
      tbody.querySelector('tr').click();
    }
  } catch (e) { alert('Error loading rules: ' + e.message); }
}
 function updateRuleControls() {
  const has = !!selectedRule;
  if (editRuleBtn) editRuleBtn.disabled = !has;
  if (deleteRuleBtn) deleteRuleBtn.disabled = !has;
 }
// Rule management buttons
if (newRuleBtn) {
  newRuleBtn.onclick = () => {
    editorMode = 'rule';
    openRuleEditor(null);
  };
}
if (editRuleBtn) {
  editRuleBtn.onclick = () => {
    if (!selectedRule) return;
    editorMode = 'rule';
    openRuleEditor(selectedRule);
  };
}
if (deleteRuleBtn) {
  deleteRuleBtn.onclick = async () => {
    if (!selectedRule || !confirm(`Delete rule '${selectedRule}'?`)) return;
    try {
      await deleteRule(selectedRule);
      selectedRule = null;
      await loadRules();
    } catch (e) {
      alert('Error deleting rule: ' + e.message);
    }
  };
}

// Dimension management functions
async function loadDimensions() {
  const listEl = document.getElementById('dimensionsList');
  listEl.innerHTML = '';
  try {
    const files = await getDimensions();
    if (!files || files.length === 0) {
      const item = document.createElement('div');
      item.className = 'list-group-item text-muted';
      item.textContent = '(no dimensions)';
      listEl.appendChild(item);
    } else {
      // Build each dimension item with key, operator/expected, description, pass/fail messages
      for (const f of files) {
        const item = document.createElement('div');
        item.className = 'list-group-item';
        item.dataset.file = f;
        // Load dimension details
        let dim = {};
        try {
          const txt = await getDimensionContent(f);
          dim = JSON.parse(txt);
        } catch {}
        const key = dim.key || f.replace(/\.(ya?ml|json)$/i, '');
        const operator = dim.operator || '';
        const expected = dim.expected || '';
        const description = dim.description || '';
        const passMsg = dim.pass_msg || '';
        const failMsg = dim.fail_msg || '';
        // Construct compact item layout
        item.innerHTML = `
          <div class="d-flex justify-content-between">
            <strong>${key}</strong>
            <small class="text-muted">Condition: ${operator}${expected ? ' ' + expected : ''}</small>
          </div>
          ${description ? `<div class="small text-truncate" title="${description}">${description}</div>` : ''}
          <div class="small mt-1">
            <span class="text-success">If pass: ${passMsg}</span>
            <span class="ml-3 text-danger">If fail: ${failMsg}</span>
          </div>
        `;
        // Click handler to select
        item.onclick = () => {
          selectedDimension = f;
          updateDimensionControls();
          document.querySelectorAll('#dimensionsList .list-group-item').forEach(el => el.classList.remove('active'));
          item.classList.add('active');
        };
        listEl.appendChild(item);
      }
      // Auto-select first available dimension
      listEl.querySelector('.list-group-item')?.click();
    }
  } catch (e) {
    alert('Error loading dimensions: ' + e.message);
  }
}
function updateDimensionControls() {
  const has = !!selectedDimension;
  editDimensionBtn.disabled = !has;
  deleteDimensionBtn.disabled = !has;
}
// Dimension button handlers
if (newDimensionBtn) {
  newDimensionBtn.onclick = () => {
    editorMode = 'dimension';
    openDimensionEditor(null);
  };
}
if (editDimensionBtn) {
  editDimensionBtn.onclick = () => {
    if (!selectedDimension) return;
    editorMode = 'dimension';
    openDimensionEditor(selectedDimension);
  };
}
if (deleteDimensionBtn) {
  deleteDimensionBtn.onclick = async () => {
    if (!selectedDimension || !confirm(`Delete dimension '${selectedDimension}'?`)) return;
    try { await deleteDimension(selectedDimension); selectedDimension = null; loadDimensions(); }
    catch (e) { alert('Error deleting dimension: ' + e.message); }
  };
}
// Reload button for dimensions list
const reloadDimsBtn = document.getElementById('reloadDimensionsList');
if (reloadDimsBtn) reloadDimsBtn.onclick = () => loadDimensions();

onLog(data => {
  if (data) {
    logArea.value += data;
    logArea.scrollTop = logArea.scrollHeight;
  }
});

// Navigation
function showSection(section) {
  // Toggle content sections
  contentScenarios.style.display = section === 'scenarios' ? 'block' : 'none';
  contentFlows.style.display = section === 'flows' ? 'block' : 'none';
  contentRules.style.display = section === 'rules' ? 'block' : 'none';
  contentDimensions.style.display = section === 'dimensions' ? 'block' : 'none';
  contentRuns.style.display = section === 'runs' ? 'block' : 'none';
  contentPastRuns.style.display = section === 'past-runs' ? 'block' : 'none';
  // Show QA section as flex container when active
  contentQA.style.display = section === 'qa' ? 'flex' : 'none';
  contentSwarms.style.display = section === 'swarms' ? 'block' : 'none';
  contentAbout.style.display = section === 'about' ? 'block' : 'none';
  // Update nav active state
  navScenarios.classList.toggle('active', section === 'scenarios');
  navFlows.classList.toggle('active', section === 'flows');
  navRules.classList.toggle('active', section === 'rules');
  navDimensions.classList.toggle('active', section === 'dimensions');
  navRuns.classList.toggle('active', section === 'runs');
  navPastRuns.classList.toggle('active', section === 'past-runs');
  navQA.classList && navQA.classList.toggle('active', section === 'qa');
  navSwarms.classList.toggle('active', section === 'swarms');
  navAbout.classList.toggle('active', section === 'about');
  // Hide rule editor, scenario/flow editor, and log section when switching tabs
  contentRuleEditor.style.display = 'none';
  contentEditor.style.display = 'none';
  logSection.style.display = 'none';
}

let runsRefreshHandle;
// Navigation event handlers
navScenarios.onclick = () => {
  console.log('NAVIGATION: clicked scenarios');
  // switch to scenarios tab, stop auto-refresh of runs
  if (runsRefreshHandle) clearInterval(runsRefreshHandle);
  loadScenarios();
  // Load swarm presets for Run tab
  loadSwarms();
  showSection('scenarios');
};
// Flows tab
navFlows.onclick = () => {
  console.log('NAVIGATION: clicked flows');
  if (runsRefreshHandle) clearInterval(runsRefreshHandle);
  loadFlows();
  showSection('flows');
};
// Rules tab
navRules.onclick = () => {
  if (runsRefreshHandle) clearInterval(runsRefreshHandle);
  if (typeof reloadRules === 'function') reloadRules();
  showSection('rules');
};
// Dimensions tab
navDimensions.onclick = () => {
  if (runsRefreshHandle) clearInterval(runsRefreshHandle);
  loadDimensions();
  showSection('dimensions');
};
// Active Runs tab
navRuns.onclick = () => {
  if (runsRefreshHandle) clearInterval(runsRefreshHandle);
  loadRuns();
  showSection('runs');
};
// Past Runs tab
navPastRuns.onclick = () => {
  if (runsRefreshHandle) clearInterval(runsRefreshHandle);
  loadPastRuns();
  showSection('past-runs');
};
// QA tab
if (navQA) navQA.onclick = () => {
  if (runsRefreshHandle) clearInterval(runsRefreshHandle);
  loadQA();
  showSection('qa');
};
// Load Swarms view
navSwarms.onclick = () => {
  if (runsRefreshHandle) clearInterval(runsRefreshHandle);
  loadSwarms();
  showSection('swarms');
};
navAbout.onclick = () => showSection('about');

// Swarm and navigation state
// Load Swarms view and handlers
async function loadSwarms() {
  // Populate Swarm presets dropdowns in both Swarms and Run tabs
  swarmSelect.innerHTML = '';
  runSwarmSelect.innerHTML = '';
  try {
    const swarms = await getSwarms();
    if (swarms.length === 0) {
      const emptyOpt = '<option>(no swarms saved)</option>';
      swarmSelect.innerHTML = emptyOpt;
      runSwarmSelect.innerHTML = emptyOpt;
    } else {
      swarms.forEach(fn => {
        const label = fn.replace(/\.json$/i, '');
        const opt1 = document.createElement('option'); opt1.value = fn; opt1.text = label;
        const opt2 = document.createElement('option'); opt2.value = fn; opt2.text = label;
        swarmSelect.appendChild(opt1);
        runSwarmSelect.appendChild(opt2);
      });
      swarmSelect.selectedIndex = 0;
      runSwarmSelect.selectedIndex = 0;
    }
  } catch (e) { alert('Error loading swarms: ' + e.message); }
  // Re-evaluate Run button enabled state after swarm list update
    updateScenarioControls();
}
// Apply selected swarm preset to worker settings
applySwarmBtn.onclick = async () => {
  const file = swarmSelect.value; if (!file) return;
  try {
    const txt = await getSwarmContent(file);
    const settingsList = JSON.parse(txt);
    workerCount.value = settingsList.length;
    updateWorkerSettingsUI();
    const divs = workerSettingsContainer.querySelectorAll('.workerSettings');
    settingsList.forEach((s,i) => {
      const div = divs[i];
      div.querySelector('.browserTypeSelect').value = s.browserType || 'chromium';
      div.querySelector('.headlessCheckbox').checked = s.headless !== false;
      div.querySelector('.viewportWidthInput').value = s.viewportWidth || '';
      div.querySelector('.viewportHeightInput').value = s.viewportHeight || '';
      const vp = div.querySelector('.viewportPresetSelect'); vp.value = s.devicePreset || 'Custom'; vp.dispatchEvent(new Event('change'));
      const uaSel = div.querySelector('.uaPresetSelect');
      uaSel.value = Object.keys(uaMap).find(k => uaMap[k] === s.userAgent) || 'custom';
      uaSel.dispatchEvent(new Event('change'));
      div.querySelector('.userAgentInput').value = s.userAgent || '';
      // HAR URL whitelist
      const wlInput = div.querySelector('.harWhitelistInput');
      wlInput.value = Array.isArray(s.harUrlWhitelist) ? s.harUrlWhitelist.join(',') : '';
    });
  } catch (e) { alert('Error applying swarm: ' + e.message); }
};
// Save current settings as a new swarm preset
newSwarmBtn.onclick = async () => {
  // Use inline swarmNameInput field for naming
  const nameInput = document.getElementById('swarmNameInput');
  const name = nameInput.value.trim();
  if (!name) { alert('Swarm name required'); return; }
  const file = name.endsWith('.json') ? name : name + '.json';
  // Build settingsList from UI
  const settingsList = Array.from(workerSettingsContainer.querySelectorAll('.workerSettings')).map(div => ({
    browserType: div.querySelector('.browserTypeSelect').value,
    headless: div.querySelector('.headlessCheckbox').checked,
    viewportWidth: parseInt(div.querySelector('.viewportWidthInput').value,10),
    viewportHeight: parseInt(div.querySelector('.viewportHeightInput').value,10),
    devicePreset: div.querySelector('.viewportPresetSelect').value,
    userAgent: div.querySelector('.userAgentInput').value.trim(),
    harUrlWhitelist: div.querySelector('.harWhitelistInput').value
      .split(',').map(s => s.trim()).filter(s => s)
  }));
  try {
    await saveSwarm(file, settingsList);
    loadSwarms(); swarmSelect.value = file;
  } catch (e) { alert('Error saving swarm: ' + e.message); }
};
// Delete selected swarm preset
deleteSwarmBtn.onclick = async () => {
  const file = swarmSelect.value; if (!file) return;
  if (!confirm(`Delete swarm '${file}'?`)) return;
  try { await deleteSwarm(file); loadSwarms(); } catch (e) { alert('Error deleting swarm: ' + e.message); }
};
// Reset Swarm builder to defaults
{ const resetBtn = document.getElementById('resetSwarmBtn');
  if (resetBtn) resetBtn.onclick = () => {
    workerCount.value = 1;
    updateWorkerSettingsUI();
    swarmSelect.selectedIndex = -1;
    document.getElementById('swarmNameInput').value = '';
  };
}
// Scenario editor state
// Scenario editor state
let editorFile = null;
let editorSteps = [];
// Currently editing step index (null = appending new)
let editingIndex = null;

// Editor UI elements
const editorNameInput = document.getElementById('editorName');
const stepTypeSelect = document.getElementById('stepTypeSelect');
const stepParams = document.getElementById('stepParams');
const addStepBtn = document.getElementById('addStepBtn');
const stepsList = document.getElementById('stepsList');
const saveScenarioBtn = document.getElementById('saveScenarioBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
// Raw editor textarea for rules/dimensions
const editorRaw = document.getElementById('editorRaw');

// Show editor pane (for scenarios or flows)
function showEditor() {
  // Hide all main content sections
  [contentScenarios, contentFlows, contentRules, contentDimensions, contentRuns, contentPastRuns, contentSwarms, contentAbout]
    .forEach(el => el.style.display = 'none');
  contentEditor.style.display = 'block';
  logSection.style.display = 'none';
  // Initialize step control UI for editor
  initStepControls();
}
// Hide editor and return to the appropriate tab
// Hide editor and return to the appropriate tab
function hideEditor() {
  contentEditor.style.display = 'none';
  if (editorMode === 'flow') {
    loadFlows();
    showSection('flows');
  } else if (editorMode === 'rule') {
    loadRules();
    showSection('rules');
  } else if (editorMode === 'dimension') {
    loadDimensions();
    showSection('dimensions');
  } else {
    // Return to scenario list, preserving selection
    loadScenarios(selectedScenario);
    showSection('scenarios');
  }
  // Reset editorMode to default (scenario)
  editorMode = 'scenario';
}

// Populate steps list UI
function renderSteps() {
  stepsList.innerHTML = '';
  editorSteps.forEach((step, idx) => {
    const li = document.createElement('li');
    // Highlight conditional steps
    if (step.action === 'ifSelector') {
      li.classList.add('conditional');
    }
    li.style.display = 'flex';
    li.style.alignItems = 'center';
    li.style.justifyContent = 'space-between';
    li.style.marginBottom = '4px';
    // Build human-readable description
    const defs = editorMode === 'flow' ? flowStepDefinitions : scenarioStepDefinitions;
    const def = defs.find(d => d.id === step.action) || { label: step.action, params: [] };
    const desc = def.params.map(p => `${p.label}: ${step.parameters[p.name]}`).join(', ');
    const textStr = `${idx+1}. ${def.label}${desc ? ': ' + desc : ''}`;
    const span = document.createElement('span'); span.textContent = textStr;
    li.appendChild(span);
    const controls = document.createElement('span');
    // Up button
    const up = document.createElement('button'); up.textContent = '↑'; up.style.marginLeft = '8px';
    up.onclick = () => { if (idx>0) { [editorSteps[idx-1],editorSteps[idx]]=[editorSteps[idx],editorSteps[idx-1]]; renderSteps(); } };
    controls.appendChild(up);
    // Down button
    const down = document.createElement('button'); down.textContent = '↓'; down.style.marginLeft = '4px';
    down.onclick = () => { if (idx<editorSteps.length-1) { [editorSteps[idx],editorSteps[idx+1]]=[editorSteps[idx+1],editorSteps[idx]]; renderSteps(); } };
    controls.appendChild(down);
    // Edit
    const edit = document.createElement('button'); edit.textContent = '✎'; edit.style.marginLeft = '4px';
    edit.onclick = () => {
      editingIndex = idx;
      stepTypeSelect.value = step.action;
      updateStepParams();
      def.params.forEach(p => {
        const inp = document.getElementById(`param-${p.name}`);
        if (inp) inp.value = step.parameters[p.name];
      });
      addStepBtn.textContent = 'Update Step';
    };
    controls.appendChild(edit);
    // Remove
    const rem = document.createElement('button'); rem.textContent = '✕'; rem.style.marginLeft = '4px';
    rem.onclick = () => { editorSteps.splice(idx,1); renderSteps(); };
    controls.appendChild(rem);
    li.appendChild(controls);
    stepsList.appendChild(li);
  });
}
// Initialize scenario editor step controls
// Update parameter input fields when the action type changes
function updateStepParams() {
  stepParams.innerHTML = '';
  const defs = editorMode === 'flow' ? flowStepDefinitions : scenarioStepDefinitions;
  const def = defs.find(d => d.id === stepTypeSelect.value);
  if (!def) return;
  def.params.forEach(p => {
    const label = document.createElement('label');
    label.textContent = `${p.label}:`;
    label.style.marginLeft = '10px';
    const inp = document.createElement('input');
    inp.type = p.type;
    inp.id = `param-${p.name}`;
    inp.style.marginLeft = '5px';
    inp.style.width = p.type === 'number' ? '80px' : '200px';
    label.appendChild(inp);
    stepParams.appendChild(label);
  });
}
// Initialize step-builder UI for scenarios or flows
function initStepControls() {
  // Choose definitions based on mode
  const defs = editorMode === 'flow' ? flowStepDefinitions : scenarioStepDefinitions;
  // Populate action types
  stepTypeSelect.innerHTML = '';
  defs.forEach(def => {
    const opt = document.createElement('option');
    opt.value = def.id; opt.text = def.label;
    stepTypeSelect.appendChild(opt);
  });
  // Update params panel when action changes
  stepTypeSelect.onchange = updateStepParams;
  updateStepParams();
  // Handle adding/updating a step
  addStepBtn.onclick = () => {
    const def = defs.find(d => d.id === stepTypeSelect.value);
    if (!def) return;
    const params = {};
    def.params.forEach(p => {
      const inp = document.getElementById(`param-${p.name}`);
      if (inp) params[p.name] = p.type === 'number' ? parseFloat(inp.value) : inp.value;
    });
    const newStep = { action: def.id, parameters: params };
    if (editingIndex !== null) {
      editorSteps[editingIndex] = newStep;
      editingIndex = null;
      addStepBtn.textContent = 'Add Step';
    } else {
      editorSteps.push(newStep);
    }
    renderSteps();
  };
}
// Save scenario to disk
// Save scenario or flow to disk
saveScenarioBtn.onclick = async () => {
  const name = editorNameInput.value.trim();
  if (!name) { alert('Name required'); return; }
  if (editorMode === 'flow') {
    // Flow save or create
    const file = editorFile || `${name}.yaml`;
    if (!editorFile) {
      try { await createFlow(name); }
      catch (e) { alert('Error creating flow: ' + e.message); return; }
    }
    // Build DSL array
    const arr = editorSteps.map(s => {
      const action = s.action;
      const def = stepDefinitions.find(d => d.id === action) || { params: [] };
      const value = def.params.length === 1 ? s.parameters[def.params[0].name] : s.parameters;
      return { [action]: value };
    });
    const content = JSON.stringify(arr, null, 2);
    await saveFlow(file, content);
    await loadFlows();
    // Highlight saved flow
    selectedFlow = file;
    document.querySelectorAll('#flowListTable tr').forEach(r => r.classList.remove('selected'));
    const frow = document.querySelector(`#flowListTable tr[data-file="${file}"]`);
    if (frow) frow.classList.add('selected');
    hideEditor();
  } else if (editorMode === 'rule') {
    // Rule save or create
    const file = editorFile || `${name}.json`;
    if (!editorFile) {
      try { await createRule(name); } catch (e) { alert('Error creating rule: ' + e.message); return; }
    }
    const content = editorRaw.value;
    await saveRule(file, content);
    await loadRules();
    selectedRule = file;
    document.querySelectorAll('#ruleListTable tr').forEach(r => r.classList.remove('selected'));
    const rrow = document.querySelector(`#ruleListTable tr[data-file="${file}"]`);
    if (rrow) rrow.classList.add('selected');
    hideEditor();
  } else if (editorMode === 'dimension') {
    // Dimension save or create (structured form)
    const file = editorFile || `${name}.json`;
    if (!editorFile) {
      try { await createDimension(name); } catch (e) { alert('Error creating dimension: ' + e.message); return; }
    }
    // Assemble dimension object from form
    const dimObj = {
      key: name,
      description: document.getElementById('dimDescription').value.trim(),
      operator: document.getElementById('dimOperator').value,
      expected: document.getElementById('dimExpected').value.trim(),
      pass_msg: document.getElementById('dimPassMsg').value.trim(),
      fail_msg: document.getElementById('dimFailMsg').value.trim()
    };
    const content = JSON.stringify(dimObj, null, 2);
    await saveDimension(file, content);
    await loadDimensions();
    // Highlight saved dimension in list-group
    selectedDimension = file;
    document.querySelectorAll('#dimensionsList .list-group-item').forEach(el => el.classList.remove('active'));
    const ditem = document.querySelector(`#dimensionsList .list-group-item[data-file="${file}"]`);
    if (ditem) ditem.classList.add('active');
    hideEditor();
  } else {
    // Scenario save or create
    const file = editorFile || `${name}.json`;
    const scenario = { name, steps: editorSteps };
    await saveScenario(file, JSON.stringify(scenario, null, 2));
    // Remember selection and return to list
    selectedScenario = file;
    hideEditor();
  }
};

cancelEditBtn.onclick = () => hideEditor();

// Open flow editor for new or existing flows
async function openFlowEditor(file) {
  editorMode = 'flow';
  // Show structured editor, hide raw textarea and any dimension form
  document.getElementById('stepControlPanel').style.display = '';
  stepsList.style.display = '';
  editorRaw.style.display = 'none';
  const dimForm = document.getElementById('dimensionForm');
  if (dimForm) dimForm.style.display = 'none';
  editorFile = file || null;
  // Load existing flow content and parse into editorSteps
  if (file) {
    let rawText = await getFlowContent(file);
    let arr;
    try { arr = JSON.parse(rawText); } catch { arr = []; }
    editorSteps = Array.isArray(arr) ? arr.map(obj => {
      const action = Object.keys(obj)[0];
      const def = stepDefinitions.find(d => d.id === action) || { params: [] };
      const value = obj[action];
      const parameters = {};
      if (def.params.length === 1) {
        const pname = def.params[0].name;
        parameters[pname] = typeof value === 'object' ? value[pname] : value;
      } else if (typeof value === 'object') {
        def.params.forEach(p => { parameters[p.name] = value[p.name]; });
      }
      return { action, parameters };
    }) : [];
    editorNameInput.value = file.replace(/\.[^/.]+$/, '');
  } else {
    editorSteps = [];
    editorNameInput.value = '';
  }
  // UI adjustments
  document.querySelector('#content-editor h3').textContent = file ? 'Edit Flow' : 'New Flow';
  saveScenarioBtn.textContent = file ? 'Save Flow' : 'Create Flow';
  renderSteps();
  showEditor();
}
// Open rule editor for new or existing rules
async function openRuleEditor(file) {
  editorMode = 'rule';
  editorFile = file || null;
  // Hide structured controls
  document.getElementById('stepControlPanel').style.display = 'none';
  stepsList.style.display = 'none';
  // Hide dimension form and show raw editor
  const dimForm = document.getElementById('dimensionForm');
  if (dimForm) dimForm.style.display = 'none';
  editorRaw.style.display = '';
  // Update titles and buttons
  document.querySelector('#content-editor h3').textContent = file ? 'Edit Rule' : 'New Rule';
  saveScenarioBtn.textContent = file ? 'Save Rule' : 'Create Rule';
  // Name input is rule filename (without extension)
  editorNameInput.value = file ? file.replace(/\.[^/.]+$/, '') : '';
  // Load rule content
  let txt = '';
  if (file) {
    try { txt = await getRuleContent(file); } catch {};
  }
  editorRaw.value = txt;
  showEditor();
}
// Open dimension editor for new or existing dimensions
async function openDimensionEditor(file) {
  editorMode = 'dimension';
  editorFile = file || null;
  // Hide structured scenario/flow controls
  document.getElementById('stepControlPanel').style.display = 'none';
  stepsList.style.display = 'none';
  // Show dimension form, hide raw editor
  const dimForm = document.getElementById('dimensionForm');
  if (dimForm) dimForm.style.display = 'block';
  editorRaw.style.display = 'none';
  // Update titles and buttons
  document.querySelector('#content-editor h3').textContent = file ? 'Edit Dimension' : 'New Dimension';
  saveScenarioBtn.textContent = file ? 'Save Dimension' : 'Create Dimension';
  // Set name/key input (without extension)
  editorNameInput.value = file ? file.replace(/\.[^/.]+$/, '') : '';
  // Load existing dimension or defaults
  let dim = { key: editorNameInput.value };
  if (file) {
    try {
      const txt = await getDimensionContent(file);
      dim = JSON.parse(txt);
    } catch {}
  }
  // Populate form fields
  document.getElementById('dimDescription').value = dim.description || '';
  document.getElementById('dimOperator').value = dim.operator || 'exists';
  document.getElementById('dimExpected').value = dim.expected || '';
  document.getElementById('dimPassMsg').value = dim.pass_msg || '';
  document.getElementById('dimFailMsg').value = dim.fail_msg || '';
  showEditor();
}
// Open editor for existing or new scenarios
async function openEditor(file) {
  editorMode = 'scenario';
  editorFile = file;
  // Show structured editor, hide raw textarea and any dimension form
  document.getElementById('stepControlPanel').style.display = '';
  stepsList.style.display = '';
  editorRaw.style.display = 'none';
  const dimForm = document.getElementById('dimensionForm');
  if (dimForm) dimForm.style.display = 'none';
  if (file) {
    const txt = await getScenarioContent(file);
    try { const sc = JSON.parse(txt); editorNameInput.value = sc.name||file.replace(/\.[^/.]+$/, ''); editorSteps = sc.steps||[]; }
    catch { editorNameInput.value = file.replace(/\.[^/.]+$/, ''); editorSteps = []; }
  } else {
    editorNameInput.value = '';
    editorSteps = [];
  }
  renderSteps();
  showEditor();
}


window.onload = () => {
  updateWorkerSettingsUI();
  // Initial tab load: trigger Scenarios view
  navScenarios.click();
  updateScenarioControls(); // ensure correct enabled state
  // Subscribe to per-worker progress updates
  onRunProgress(({ runId, data: msg }) => {
    // Total steps
    if (msg.startsWith('SCENARIO_STEPS:')) {
      const total = parseInt(msg.split(':')[1], 10);
      progressData[runId] = { total, current: 0 };
      // Initialize step info
      const stepSpan = document.getElementById(`${runId}-step`);
      if (stepSpan) stepSpan.textContent = `0/${total}`;
    }
    // Executing step: update background and single-line info
    const m = msg.match(/Executing step (\d+):\s*(.+)/);
    if (m) {
      const idx = parseInt(m[1], 10);
      const action = m[2];
      const pd = progressData[runId] || {};
      pd.current = idx;
      progressData[runId] = pd;
      // Update background width
      const container = document.getElementById(runId);
      if (container) {
        const bg = container.querySelector('.progressBg');
        if (bg && pd.total) {
          const pct = (pd.current / pd.total) * 100;
          bg.style.width = pct + '%';
        }
      }
      // Update step info
      const stepSpan = document.getElementById(`${runId}-step`);
      if (stepSpan && pd.total) {
        stepSpan.textContent = `${action} (${idx}/${pd.total})`;
      }
    }
  });
  // Refresh active runs view when a worker completes
  onRunComplete(({ runId, code }) => {
    loadRuns();
  });
  // Handle single-run rule results
  onRuleResults(results => {
    const pre = document.getElementById('editorRaw') || null;
    // If raw editor is visible, skip (user editing), else show results
    const resultsArea = document.getElementById('ruleResultsArea');
    if (resultsArea) {
      resultsArea.style.display = '';
      resultsArea.textContent = JSON.stringify(results, null, 2);
    } else {
      alert('Rule Results:\n' + JSON.stringify(results, null, 2));
    }
  });
};

/**
 * Load and display active batches and past runs
 */
// Load currently active runs into activeWorkersList
async function loadRuns() {
  // Preserve scroll position
  const prevScroll = window.scrollY;
  activeWorkersList.innerHTML = '';
  try {
    const workers = await listActiveRuns();
    const running = workers.filter(w => w.status === 'running');
    if (running.length === 0) {
      activeWorkersList.innerHTML = '<div>(no active workers)</div>';
    } else {
      running.forEach(w => {
        const container = document.createElement('div');
        container.className = 'activeRunItem';
        container.id = w.runId;
        const bgDiv = document.createElement('div'); bgDiv.className = 'progressBg';
        container.appendChild(bgDiv);
        const contentDiv = document.createElement('div'); contentDiv.className = 'activeContent';
        const titleSpan = document.createElement('span');
        titleSpan.innerHTML = `<strong>${w.runId}</strong> [${w.scenarioPath}] - <em>${w.status}</em>`;
        contentDiv.appendChild(titleSpan);
        const stepSpan = document.createElement('span'); stepSpan.id = `${w.runId}-step`;
        stepSpan.style.marginLeft = 'auto'; contentDiv.appendChild(stepSpan);
        const cancelBtn = document.createElement('button'); cancelBtn.textContent = 'Cancel';
        cancelBtn.onclick = async () => { await cancelRun(w.runId); loadRuns(); };
        contentDiv.appendChild(cancelBtn);
        container.appendChild(contentDiv);
        activeWorkersList.appendChild(container);
      });
    }
  } catch (e) {
    activeWorkersList.innerHTML = `<div>Error loading active runs: ${e.message}</div>`;
  }
  window.scrollTo(0, prevScroll);
}

// Load past scenario run groups into runsList
async function loadPastRuns() {
  const prevScroll = window.scrollY;
  runsList.innerHTML = '';
  // Prepare logs directory for screenshot paths
  const logsDir = await getLogsDir();
  try {
    const groups = await getPastRunGroups();
    if (groups.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td'); td.colSpan = 5;
      td.textContent = '(no past runs found)';
      tr.appendChild(td);
      runsList.appendChild(tr);
    } else {
      groups.forEach(gr => {
        const headerTr = document.createElement('tr'); headerTr.className = 'group-header';
        const headerTd = document.createElement('td'); headerTd.colSpan = 5;
        const isExpanded = expandedGroups.has(gr.group);
        headerTd.textContent = `${isExpanded ? '▼' : '▶'} ${gr.group} (${gr.workers.length} workers)`;
        const deleteBtn = document.createElement('button'); deleteBtn.textContent = 'Delete Group';
        deleteBtn.style.marginLeft = '8px';
        deleteBtn.onclick = async e => {
          e.stopPropagation();
          if (confirm(`Delete all logs in group '${gr.group}'?`)) { await deletePastRunGroup(gr.group); loadPastRuns(); }
        };
        headerTd.appendChild(deleteBtn);
        headerTr.appendChild(headerTd);
        runsList.appendChild(headerTr);
        gr.workers.forEach(w => {
          const tr = document.createElement('tr'); tr.dataset.group = gr.group;
          tr.style.display = isExpanded ? '' : 'none';
          const td1 = document.createElement('td'); td1.style.padding = '4px'; td1.textContent = '';
          const td2 = document.createElement('td'); td2.style.padding = '4px'; td2.textContent = w.label;
          const td3 = document.createElement('td'); td3.style.padding = '4px';
          if (w.har) { const btn = document.createElement('button'); btn.textContent = 'Open HAR'; btn.onclick = () => openScreenshot(gr.group, w.label, w.har); td3.appendChild(btn); }
          else td3.textContent = '-';
          const td4 = document.createElement('td'); td4.style.padding = '4px';
          if (w.screenshots && w.screenshots.length) {
            w.screenshots.forEach(sh => {
              const img = document.createElement('img');
              img.src = `file://${logsDir}/${gr.group}/${w.label}/${sh}`;
              img.style.width = '80px'; img.style.marginRight = '4px'; img.style.cursor = 'pointer'; img.title = sh;
              img.onclick = () => openScreenshot(gr.group, w.label, sh);
              td4.appendChild(img);
            });
          } else td4.textContent = '-';
          const td5 = document.createElement('td'); td5.style.padding = '4px'; td5.textContent = '';
          [td1,td2,td3,td4,td5].forEach(td => tr.appendChild(td));
          runsList.appendChild(tr);
        });
        headerTr.onclick = async () => {
          const currentlyExpanded = headerTd.textContent.startsWith('▼');
          const newExpanded = !currentlyExpanded;
          headerTd.textContent = `${newExpanded ? '▼' : '▶'} ${gr.group} (${gr.workers.length} workers)`;
          headerTd.appendChild(deleteBtn);
          document.querySelectorAll(`tr[data-group="${gr.group}"]`).forEach(r => r.style.display = newExpanded ? '' : 'none');
          if (newExpanded) expandedGroups.add(gr.group); else expandedGroups.delete(gr.group);
        };
      });
    }
  } catch (e) {
    const tr = document.createElement('tr'); const td = document.createElement('td'); td.colSpan = 5;
    td.textContent = `Error loading runs: ${e.message}`; tr.appendChild(td); runsList.appendChild(tr);
  }
  window.scrollTo(0, prevScroll);
}