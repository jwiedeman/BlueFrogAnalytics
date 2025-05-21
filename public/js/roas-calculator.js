document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('roas-form');
  const resultsEl = document.getElementById('roas-results');
  const chartEl = d3.select('#roas-chart');
  const width = +chartEl.attr('width');
  const height = +chartEl.attr('height');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const aov = parseFloat(document.getElementById('aov').value) || 0;
    const cogs = parseFloat(document.getElementById('cogs').value) || 0;
    const spend = parseFloat(document.getElementById('spend').value) || 0;
    const cpc = parseFloat(document.getElementById('cpc').value) || 0.01;
    const cvr = parseFloat(document.getElementById('cvr').value) / 100 || 0;

    const scenarios = [
      { name: 'Worst', rate: cvr * 0.8 },
      { name: 'Probable', rate: cvr },
      { name: 'Best', rate: cvr * 1.2 }
    ];

    const days = 180;
    const dailySpend = spend / days;

    scenarios.forEach(s => {
      let cumulativeProfit = 0;
      let totalRevenue = 0;
      const values = [];
      for (let d = 1; d <= days; d++) {
        const clicks = dailySpend / cpc;
        const conversions = clicks * s.rate;
        const revenue = conversions * aov;
        const grossProfit = revenue - conversions * cogs;
        const netProfit = grossProfit - dailySpend;
        cumulativeProfit += netProfit;
        totalRevenue += revenue;
        values.push({ day: d, profit: cumulativeProfit });
      }
      s.values = values;
      s.netProfit = cumulativeProfit;
      s.roas = spend ? totalRevenue / spend : 0;
    });

    resultsEl.innerHTML = `<table><tr><th>Scenario</th><th>ROAS</th><th>Profit</th></tr>${scenarios
      .map(s => `<tr><td>${s.name}</td><td>${s.roas.toFixed(2)}</td><td>${s.netProfit.toFixed(2)}</td></tr>`)
      .join('')}</table>`;

    const series = scenarios.map(s => ({ name: s.name, values: s.values }));

    // draw chart
    chartEl.selectAll('*').remove();
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const x = d3.scaleLinear().domain([1, days]).range([0, innerWidth]);
    const y = d3.scaleLinear()
      .domain([
        d3.min(series, s => d3.min(s.values, v => v.profit)),
        d3.max(series, s => d3.max(s.values, v => v.profit))
      ])
      .nice()
      .range([innerHeight, 0]);

    const line = d3.line()
      .x(d => x(d.day))
      .y(d => y(d.profit));

    const g = chartEl.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x));
    g.append('g').call(d3.axisLeft(y));

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    series.forEach((s, idx) => {
      g.append('path')
        .datum(s.values)
        .attr('fill', 'none')
        .attr('stroke', color(idx))
        .attr('stroke-width', 2)
        .attr('d', line);
    });
  });
});

