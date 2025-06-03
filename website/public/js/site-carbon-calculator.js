document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://api.bluefroganalytics.com:6001';
  const form = document.getElementById('carbon-form');
  const chartEl = d3.select('#carbon-chart');
  const width = chartEl.node().clientWidth || +chartEl.attr('width');
  const height = +chartEl.attr('height');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const url = document.getElementById('carbon-url').value;
    const results = document.getElementById('carbon-results');
    results.textContent = `Calculating carbon footprint for ${url}...`;
    chartEl.selectAll('*').remove();
    try {
      const token = await window.firebaseAuth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/api/tools/carbon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) {
        results.textContent = data.error || 'Calculation failed.';
        return;
      }
      const grams = data.co2;
      const miles = grams / 404; // ~404g CO2 per mile driven
      const bulbMinutes = (grams / 27) * 60; // 60W bulb ~27g CO2/hour
      results.innerHTML =
        `<p>Bytes transferred: <strong>${data.bytes.toLocaleString()}</strong></p>` +
        '<p>Emission factor: 0.5 µg CO₂ per byte</p>' +
        `<p>Estimated CO₂: <strong>${grams.toFixed(6)} g</strong></p>` +
        `<p>Equivalent to driving <strong>${miles.toFixed(4)} miles</strong> or` +
        `powering a 60W bulb for <strong>${bulbMinutes.toFixed(2)} minutes</strong>.</p>`;

      const scenarios = [
        { name: '1 Page', pages: 1, minutes: 1 },
        { name: '5 Pages', pages: 5, minutes: 5 },
        { name: '30m Doomscroll', pages: 30, minutes: 30 }
      ];
      const carbonIntensity = 0.417; // g per Wh
      const mobilePower = 5; // W
      const desktopPower = 50; // W
      const dataset = scenarios.map(s => {
        const transfer = grams * s.pages;
        const hours = s.minutes / 60;
        const mobile = transfer + mobilePower * hours * carbonIntensity;
        const desktop = transfer + desktopPower * hours * carbonIntensity;
        return { name: s.name, mobile, desktop };
      });
      drawChart(dataset);
    } catch (err) {
      console.error(err);
      results.textContent = 'Error running calculation.';
    }
  });

  function drawChart(data) {
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const x0 = d3
      .scaleBand()
      .domain(data.map(d => d.name))
      .range([0, innerWidth])
      .padding(0.1);
    const x1 = d3
      .scaleBand()
      .domain(['mobile', 'desktop'])
      .range([0, x0.bandwidth()])
      .padding(0.05);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, d => Math.max(d.mobile, d.desktop))])
      .nice()
      .range([innerHeight, 0]);
    const color = d3.scaleOrdinal().domain(['mobile', 'desktop']).range(['#0d6efd', '#6c757d']);
    const g = chartEl.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x0));
    g.append('g').call(d3.axisLeft(y));
    const groups = g
      .selectAll('g.group')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'group')
      .attr('transform', d => `translate(${x0(d.name)},0)`);
    groups
      .selectAll('rect')
      .data(d => [
        { key: 'mobile', value: d.mobile },
        { key: 'desktop', value: d.desktop }
      ])
      .enter()
      .append('rect')
      .attr('x', d => x1(d.key))
      .attr('y', d => y(d.value))
      .attr('width', x1.bandwidth())
      .attr('height', d => innerHeight - y(d.value))
      .attr('fill', d => color(d.key));
  }
});
