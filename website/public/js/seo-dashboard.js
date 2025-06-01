document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('seo-dashboard-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('seo-dashboard-url').value;
    const results = document.getElementById('seo-dashboard-results');
    results.textContent = `Running SEO audit for ${url}...`;
    try {
      const user = window.firebaseAuth.currentUser;
      if (!user) throw new Error('Not authenticated');
      const token = await user.getIdToken();
      const res = await fetch('https://www.api.bluefroganalytics.com/api/seo-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit failed');
      let html = `<h2>SEO Score: ${Math.round(data.categories.seo.score * 100)}</h2>`;
      html += '<ul class="list-group">';
      data.categories.seo.auditRefs.forEach(ref => {
        const audit = data.audits[ref.id];
        if (!audit) return;
        const score = audit.score === null ? 'N/A' : Math.round(audit.score * 100);
        const badge = audit.score === 1 ? 'success' : audit.score === 0 ? 'danger' : 'secondary';
        html += `<li class="list-group-item d-flex justify-content-between align-items-center">${audit.title}<span class="badge bg-${badge}">${score}</span></li>`;
      });
      html += '</ul>';
      results.innerHTML = html;
    } catch (err) {
      results.textContent = err.message;
    }
  });
});
