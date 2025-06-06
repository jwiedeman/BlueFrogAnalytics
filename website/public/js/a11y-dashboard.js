document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const domainSelect = document.getElementById('domain-select');
  const domainResults = document.getElementById('domain-results');
  const pageResults = document.getElementById('page-results');

  const loadDomain = async (user, domain) => {
    try {
      const token = await user.getIdToken();
      const [infoRes, pagesRes] = await Promise.all([
        fetch(`${API_BASE}/api/domain-info?domain=${encodeURIComponent(domain)}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/domain-pages?domain=${encodeURIComponent(domain)}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const info = infoRes.ok ? await infoRes.json() : {};
      const pages = pagesRes.ok ? await pagesRes.json() : [];

      const score =
        info.mobile_accessibility_score ?? info.desktop_accessibility_score;
      domainResults.innerHTML =
        typeof score === 'number'
          ? `<p>Accessibility Score: <strong>${score}</strong></p>`
          : '<p>No accessibility score available.</p>';

      let html = '<table class="table table-striped"><thead><tr><th>Page</th><th>Mobile</th><th>Desktop</th></tr></thead><tbody>';
      pages.forEach(p => {
        html += `<tr><td>${p.url}</td><td>${
          p.mobile_accessibility_score ?? '--'
        }</td><td>${p.desktop_accessibility_score ?? '--'}</td></tr>`;
      });
      html += '</tbody></table>';
      pageResults.innerHTML = html;
    } catch (err) {
      console.error(err);
    }
  };

  const init = () => {
    window.onAuthStateChanged(window.firebaseAuth, async user => {
      if (!user) {
        window.location.href = '/login';
        return;
      }
      const token = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const profile = res.ok ? await res.json() : {};
      const domains = Array.isArray(profile.domains) ? profile.domains : [];
      domainSelect.innerHTML = domains
        .map(d => `<option value="${d}">${d}</option>`)
        .join('');
      if (domains.length) {
        loadDomain(user, domains[0]);
      }
      domainSelect.addEventListener('change', () => {
        loadDomain(user, domainSelect.value);
      });
    });
  };

  if (window.firebaseAuth) {
    init();
  } else {
    document.addEventListener('firebase-init', init, { once: true });
  }
});
