document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('drag-form');
  const results = document.getElementById('drag-results');
  const chartEl = d3.select('#drag-waterfall');
  const slowestEl = document.getElementById('drag-slowest');
  const largestEl = document.getElementById('drag-largest');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('drag-url').value;
    results.textContent = `Running Tag Drag Race for ${url}...`;
    slowestEl.innerHTML = '';
    largestEl.innerHTML = '';
    chartEl.selectAll('*').remove();
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/tools/tag-drag-race`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) {
        results.textContent = data.error || 'Request failed.';
        return;
      }
      results.textContent = '';
      const scripts = data.scripts.filter(s => typeof s.ms === 'number');
      const width = chartEl.node().clientWidth || +chartEl.attr('width');
      const barHeight = 20;
      const margin = { top: 20, right: 20, bottom: 30, left: 150 };
      const height = scripts.length * barHeight + margin.top + margin.bottom;
      chartEl.attr('height', height);
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      const x = d3.scaleLinear().domain([0, d3.max(scripts, d => d.ms)]).range([0, innerWidth]);
      const y = d3.scaleBand()
        .domain(scripts.map(d => d.src))
        .range([0, innerHeight])
        .padding(0.1);
      const g = chartEl.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
      g.append('g').call(d3.axisLeft(y));
      g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x));
      g.selectAll('rect')
        .data(scripts)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', d => y(d.src))
        .attr('width', d => x(d.ms))
        .attr('height', y.bandwidth())
        .attr('fill', '#0d6efd');
      g.selectAll('text.bar')
        .data(scripts)
        .enter()
        .append('text')
        .attr('class', 'bar')
        .attr('x', d => x(d.ms) + 5)
        .attr('y', d => y(d.src) + y.bandwidth() / 2)
        .attr('dy', '0.35em')
        .text(d => `${d.ms}ms`);

      const slowest = scripts
        .slice()
        .sort((a, b) => b.ms - a.ms)
        .slice(0, 5);
      const slowRows = slowest
        .map(s => `<tr><td>${s.src}</td><td>${s.ms}<\/td><\/tr>`)
        .join('');
      slowestEl.innerHTML = `<table class="table table-sm table-bordered"><thead><tr><th>Script<\/th><th>ms<\/th><\/tr><\/thead><tbody>${slowRows}<\/tbody><\/table>`;

      const largest = data.scripts
        .filter(s => typeof s.bytes === 'number')
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 5);
      const largeRows = largest
        .map(s => `<tr><td>${s.src}</td><td>${s.bytes}<\/td><\/tr>`)
        .join('');
      largestEl.innerHTML = `<table class="table table-sm table-bordered"><thead><tr><th>Script<\/th><th>Bytes<\/th><\/tr><\/thead><tbody>${largeRows}<\/tbody><\/table>`;
    } catch (err) {
      console.error(err);
      results.textContent = 'Error running analysis.';
    }
  });
});
