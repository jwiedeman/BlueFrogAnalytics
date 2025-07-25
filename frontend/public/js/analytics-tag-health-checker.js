
import { logTestStatus } from './test-status.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE_URL = (window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001') + '/api/tag-health';

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
  const PAGE_SIZE = 25;

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

  const METHOD_VARIATIONS = {
    gtm: 'gtm',
    google_tag_manager: 'gtm',
    'google_tag': 'gtm',
    tag_manager: 'gtm',
    gtag: 'gtm',
    gtm_ss: 'gtm',
    gtm_server: 'gtm',
    segment: 'segment',
    'segment_io': 'segment'
  };

  function canonicalizeMethod(method) {
    let cleaned = String(method || '').toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    if (cleaned.startsWith('via_')) {
      cleaned = cleaned.slice(4);
    }
    return METHOD_VARIATIONS[cleaned] || cleaned;
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



  function formatName(key) {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function renderFilter() {
    const container = document.getElementById('column-buttons');
    if (!container) return;
    container.innerHTML = '';
    ANALYTICS_KEYS.forEach(key => {
      const id = `col-${key}`;
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'btn-check';
      input.id = id;
      input.value = key;
      input.autocomplete = 'off';
      input.checked = selectedColumns.includes(key);
      const label = document.createElement('label');
      label.className = 'btn btn-outline-primary btn-sm';
      label.setAttribute('for', id);
      label.textContent = formatName(key);
      container.appendChild(input);
      container.appendChild(label);
    });

    container.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', () => {
        selectedColumns = Array.from(container.querySelectorAll('input:checked')).map(i => i.value);
        saveSelected();
        if (lastResult) renderResults(lastResult);
      });
    });
  }

  function renderResults(data) {
    lastResult = data;
    const listEl = document.getElementById('pages-list');
    const paginationEl = document.getElementById('pagination');
    const summaryEl = document.getElementById('summary');
    listEl.innerHTML = '';
    paginationEl.innerHTML = '';
    summaryEl.innerHTML = '';

    const pages = data.page_results ? Object.entries(data.page_results) : [];
    let currentPage = 1;

    function renderPage(pageNum) {
      listEl.innerHTML = '';
      const start = (pageNum - 1) * PAGE_SIZE;
      const slice = pages.slice(start, start + PAGE_SIZE);
      slice.forEach(([url, analytics]) => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
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
        li.appendChild(link);

        const tagList = document.createElement('ul');
        tagList.className = 'page-analytics list-unstyled ms-3 mt-1 mb-0';
        selectedColumns.forEach(key => {
          const entry = analytics[key];
          if (entry) {
            const ids = (entry.ids || []).join(', ') || 'unknown id';
            const method = canonicalizeMethod(entry.method || 'native');
            const canonical = canonicalize(key);
            const idSlug = slugify(canonical + '-note');
            const methodSlug = slugify('method-' + method);
            const pillClass = 'analytics-pill badge bg-primary ' + slugify(canonical);
            const methodClass = 'analytics-pill badge bg-secondary method-' + slugify(method);
            let containerText = '';
            if (method === 'gtm' && analytics.google_tag_manager) {
              const gtmIds = (analytics.google_tag_manager.ids || []).join(', ');
              if (gtmIds) containerText = ` | ${gtmIds}`;
            } else if (method === 'segment' && analytics.segment) {
              const segIds = (analytics.segment.ids || []).join(', ');
              if (segIds) containerText = ` | ${segIds}`;
            }
            const tagLi = document.createElement('li');
            tagLi.innerHTML =
              `${formatName(key)} <a href="#${idSlug}" class="${pillClass}">${ids}</a> via ` +
              `<a href="#${methodSlug}" class="${methodClass}">${method}</a>${containerText}`;
            tagList.appendChild(tagLi);
          }
        });
        if (tagList.childElementCount) li.appendChild(tagList);

        listEl.appendChild(li);
      });
    }

    function renderPagination() {
      paginationEl.innerHTML = '';
      const totalPages = Math.ceil(pages.length / PAGE_SIZE);
      if (totalPages <= 1) return;
      for (let i = 1; i <= totalPages; i++) {
        const item = document.createElement('li');
        item.className = 'page-item' + (i === currentPage ? ' active' : '');
        const a = document.createElement('a');
        a.className = 'page-link';
        a.href = '#';
        a.textContent = i;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          currentPage = i;
          renderPage(currentPage);
          renderPagination();
        });
        item.appendChild(a);
        paginationEl.appendChild(item);
      }
    }

    renderPage(currentPage);
    renderPagination();

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
        const method = canonicalizeMethod(info.method || 'native');
        const canonical = canonicalize(name);
        const idSlug = slugify(canonical + '-note');
        const methodSlug = slugify('method-' + method);
        const pillClass = 'analytics-pill badge bg-primary ' + slugify(canonical);
        const methodClass = 'analytics-pill badge bg-secondary method-' + slugify(method);
        let containerText = '';
        if (method === 'gtm' && data.found_analytics.google_tag_manager) {
          const gtmIds = (data.found_analytics.google_tag_manager.ids || []).join(', ');
          if (gtmIds) containerText = ` | ${gtmIds}`;
        } else if (method === 'segment' && data.found_analytics.segment) {
          const segIds = (data.found_analytics.segment.ids || []).join(', ');
          if (segIds) containerText = ` | ${segIds}`;
        }
        li.innerHTML =
          `${formatName(name)} <a href="#${idSlug}" class="${pillClass}">${ids}</a> via ` +
          `<a href="#${methodSlug}" class="${methodClass}">${method}</a>${containerText}`;
        ul.appendChild(li);
      }
    }
    summaryEl.appendChild(ul);

    attachPillHandlers();
  }

  document.getElementById('scan-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const domain = document.getElementById('domain').value.trim();
    const maxPages = parseInt(document.getElementById('max-pages').value, 10) || 50;
    const statusEl = document.getElementById('status');
    const progressBar = document.getElementById('progress-bar');
    const etaEl = document.getElementById('eta');

    statusEl.textContent = 'Resolving domain variants...';
    progressBar.style.width = '0%';
    etaEl.textContent = '';
    document.getElementById('pages-list').innerHTML = '';
    document.getElementById('pagination').innerHTML = '';
    document.getElementById('summary').innerHTML = '';

    const token = window.firebaseAuth && window.firebaseAuth.currentUser
      ? await window.firebaseAuth.currentUser.getIdToken()
      : '';
    logTestStatus('tag-health', 'started');
    const es = new EventSource(
      `${API_BASE_URL}/stream?domain=${encodeURIComponent(domain)}&maxPages=${maxPages}&token=${encodeURIComponent(token)}`,
      { withCredentials: true }
    );
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
        logTestStatus('tag-health', 'complete');
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
      logTestStatus('tag-health', 'error');
    };
  });

  loadSelected();
  renderFilter();


  document.getElementById('select-all')?.addEventListener('click', () => {
    selectedColumns = [...ANALYTICS_KEYS];
    saveSelected();
    renderFilter();
    if (lastResult) renderResults(lastResult);
  });

  document.getElementById('clear-all')?.addEventListener('click', () => {
    selectedColumns = [];
    saveSelected();
    renderFilter();
    if (lastResult) renderResults(lastResult);
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

  function attachPillHandlers() {
    document.querySelectorAll('a.analytics-pill').forEach(a => {
      a.addEventListener('click', () => {
        const hash = a.getAttribute('href');
        openDetailsFromHash(hash);
      });
    });
  }
  attachPillHandlers();
  openDetailsFromHash(location.hash);
  window.addEventListener('hashchange', () => {
    openDetailsFromHash(location.hash);
  });
});
