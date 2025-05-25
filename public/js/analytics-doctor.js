
document.addEventListener('DOMContentLoaded', () => {
  const API_BASE_URL = 'https://84e5-24-20-99-62.ngrok-free.app';

  const ANALYTICS_KEYS = [
    'google_analytics',
    'google_tag_manager',
    'segment',
    'meta_pixel',
    'bing',
    'adobe_analytics',
    'mixpanel',
    'hotjar',
    'amplitude'
  ];

  // Map common variations to canonical keys to ensure links always resolve
  const KEY_VARIATIONS = {
    ga4: 'google_analytics',
    googleanalytics: 'google_analytics',
    'google_analytics_4': 'google_analytics',
    gtm: 'google_tag_manager',
    'google_tag': 'google_tag_manager',
    facebook_pixel: 'meta_pixel',
    fb_pixel: 'meta_pixel'
  };

  function canonicalize(key) {
    const cleaned = key.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    return KEY_VARIATIONS[cleaned] || cleaned;
  }

  const STORAGE_KEY = 'analyticsColumns';
  let selectedColumns = [...ANALYTICS_KEYS];
  let lastResult = null;

  function slugify(str) {
    return String(str)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function loadSelected() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(stored)) {
        selectedColumns = ANALYTICS_KEYS.filter(k => stored.includes(k));
        if (selectedColumns.length === 0) {
          selectedColumns = [...ANALYTICS_KEYS];
        }
      }
    } catch (e) {
      selectedColumns = [...ANALYTICS_KEYS];
    }
  }

  function saveSelected() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedColumns));
  }

  function adjustTableWidth() {
    const wrapper = document.getElementById('table-wrapper');
    if (!wrapper) return;
    const cols = selectedColumns.length + 1; // include URL column
    if (cols <= 3) {
      wrapper.classList.add('boxed');
    } else {
      wrapper.classList.remove('boxed');
    }
  }

  function formatName(key) {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function renderFilter() {
    const select = document.getElementById('column-select');
    if (!select) return;
    select.innerHTML = '';
    ANALYTICS_KEYS.forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = formatName(key);
      opt.selected = selectedColumns.includes(key);
      select.appendChild(opt);
    });
  }

  function renderResults(data) {
    lastResult = data;
    adjustTableWidth();
    const headerRow = document.getElementById('pages-header');
    const bodyEl = document.getElementById('pages-body');
    const summaryEl = document.getElementById('summary');

    headerRow.innerHTML = '';
    bodyEl.innerHTML = '';
    summaryEl.innerHTML = '';

    headerRow.appendChild(document.createElement('th')).textContent = 'URL';
    selectedColumns.forEach(key => {
      const th = document.createElement('th');
      th.textContent = formatName(key);
      headerRow.appendChild(th);
    });

    if (data.page_results) {
      for (const [url, analytics] of Object.entries(data.page_results)) {
        const tr = document.createElement('tr');
        const urlCell = document.createElement('td');
        const link = document.createElement('a');
        let path;
        try {
          const parsed = new URL(url);
          path = parsed.pathname + parsed.search + parsed.hash;
        } catch (e) {
          path = url;
        }
        link.textContent = path || '/';
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        urlCell.appendChild(link);
        tr.appendChild(urlCell);
        selectedColumns.forEach(key => {
          const td = document.createElement('td');
          const entry = analytics[key];
          if (entry) {
            const ids = (entry.ids || []).join(', ') || 'unknown id';
            const method = entry.method || 'native';
            const canonical = canonicalize(key);
            const idSlug = slugify(canonical + '-note');
            const methodSlug = slugify('method-' + method);
            const pillClass = 'analytics-pill badge bg-primary ' + slugify(canonical);
            const methodClass = 'analytics-pill badge bg-secondary method-' + slugify(method);
            td.className = 'analytics-cell';
            td.innerHTML =
              `<a href="#${idSlug}" class="${pillClass}">${ids}</a>` +
              ` <a href="#${methodSlug}" class="${methodClass}">via ${method}</a>`;
          } else {
            td.textContent = '';
          }
          tr.appendChild(td);
        });
        bodyEl.appendChild(tr);
      }
    }

    const summaryTitle = document.createElement('h2');
    summaryTitle.textContent = 'Summary';
    summaryEl.appendChild(summaryTitle);
    if (data.variant_results) {
      const variantTitle = document.createElement('h3');
      variantTitle.textContent = 'Variant Status';
      summaryEl.appendChild(variantTitle);
      const vlist = document.createElement('ul');
      for (const [variant, info] of Object.entries(data.variant_results)) {
        const li = document.createElement('li');
        if (info.error) {
          li.textContent = `${variant} -> error: ${info.error}`;
        } else if (info.chain && Array.isArray(info.chain)) {
          let text = variant;
          for (let i = 0; i < info.chain.length; i++) {
            const step = info.chain[i];
            text += ` -> ${step.status}`;
            if (i < info.chain.length - 1) {
              text += ` to ${info.chain[i + 1].url}`;
            }
          }
          li.textContent = text;
        } else {
          li.textContent = `${variant} -> ${info.status}`;
        }
        vlist.appendChild(li);
      }
      summaryEl.appendChild(vlist);
    }
    const ul = document.createElement('ul');
    if (data.found_analytics) {
      for (const [name, info] of Object.entries(data.found_analytics)) {
        const li = document.createElement('li');
        const ids = (info.ids || []).join(', ') || 'unknown id';
        const method = info.method || 'native';
        const canonical = canonicalize(name);
        const idSlug = slugify(canonical + '-note');
        const methodSlug = slugify('method-' + method);
        const pillClass = 'analytics-pill badge bg-primary ' + slugify(canonical);
        const methodClass = 'analytics-pill badge bg-secondary method-' + slugify(method);
        li.innerHTML =
          `${formatName(name)} ` +
          `<a href="#${idSlug}" class="${pillClass}">${ids}</a>` +
          ` <a href="#${methodSlug}" class="${methodClass}">via ${method}</a>`;
        ul.appendChild(li);
      }
    }
    summaryEl.appendChild(ul);
  }

  document.getElementById('scan-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const domain = document.getElementById('domain').value.trim();
    const maxPages = parseInt(document.getElementById('max-pages').value, 10) || 50;
    const statusEl = document.getElementById('status');
    const progressBar = document.getElementById('progress-bar');
    const etaEl = document.getElementById('eta');

    statusEl.textContent = 'Resolving domain variants...';
    progressBar.style.width = '0%';
    etaEl.textContent = '';
    document.getElementById('pages-header').innerHTML = '';
    document.getElementById('pages-body').innerHTML = '';
    document.getElementById('summary').innerHTML = '';

    const es = new EventSource(`${API_BASE_URL}/scan-stream?domain=${encodeURIComponent(domain)}&maxPages=${maxPages}`);
    let startTime = null;
    es.addEventListener('queue', (e) => {
      const data = JSON.parse(e.data);
      if (data.position > 0) {
        statusEl.textContent = `Queued... position ${data.position}`;
        progressBar.style.width = '0%';
        etaEl.textContent = '';
      } else {
        statusEl.textContent = 'Starting page scan...';
      }
    });
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.done) {
        es.close();
        renderResults(data.result);
        statusEl.textContent = 'Scan complete';
        progressBar.style.width = '100%';
        etaEl.textContent = '';
      } else if (typeof data.scanned !== 'undefined') {
        if (!startTime) startTime = Date.now();
        statusEl.textContent = `Scanned ${data.scanned}: ${data.url}`;
        const percent = Math.min(100, (data.scanned / maxPages) * 100);
        progressBar.style.width = percent + '%';

        const elapsed = (Date.now() - startTime) / 1000;
        const total = (elapsed / data.scanned) * maxPages;
        const remaining = Math.max(0, total - elapsed);
        etaEl.textContent = `Estimated time remaining: ${Math.round(remaining)}s`;
      } else if (data.variant_results) {
        statusEl.textContent = 'Starting page scan...';
      }
    };
    es.onerror = () => {
      statusEl.textContent = 'Error connecting to server.';
      es.close();
    };
  });

  loadSelected();
  renderFilter();
  adjustTableWidth();

  const selectEl = document.getElementById('column-select');
  selectEl?.addEventListener('change', () => {
    selectedColumns = Array.from(selectEl.selectedOptions).map(o => o.value);
    saveSelected();
    if (lastResult) renderResults(lastResult);
    adjustTableWidth();
  });

  document.getElementById('select-all')?.addEventListener('click', () => {
    selectedColumns = [...ANALYTICS_KEYS];
    saveSelected();
    renderFilter();
    Array.from(selectEl.options).forEach(o => (o.selected = true));
    if (lastResult) renderResults(lastResult);
    adjustTableWidth();
  });

  document.getElementById('clear-all')?.addEventListener('click', () => {
    selectedColumns = [];
    saveSelected();
    renderFilter();
    Array.from(selectEl.options).forEach(o => (o.selected = false));
    if (lastResult) renderResults(lastResult);
    adjustTableWidth();
  });

  function openDetailsFromHash(hash) {
    if (!hash) return;
    const id = hash.replace(/^#/, '');
    let el = document.getElementById(id) ||
      document.getElementById(id.replace(/-/g, '_')) ||
      document.getElementById(id.replace(/_/g, '-'));
    if (!el) return;
    if (el.tagName.toLowerCase() === 'details') {
      el.open = true;
    } else if (el.classList.contains('accordion-item')) {
      const button = el.querySelector('.accordion-button');
      if (button && button.classList.contains('collapsed')) {
        button.click();
      }
    }
  }

  document.querySelectorAll('a.analytics-pill').forEach(a => {
    a.addEventListener('click', (e) => {
      const hash = a.getAttribute('href');
      openDetailsFromHash(hash);
    });
  });
  openDetailsFromHash(location.hash);
  window.addEventListener('hashchange', () => {
    openDetailsFromHash(location.hash);
  });
});
