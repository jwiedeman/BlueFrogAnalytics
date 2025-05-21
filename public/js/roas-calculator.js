document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('roas-form');
  const resultsEl = document.getElementById('roas-results');
  const chartEl = d3.select('#roas-chart');
  const width = +chartEl.attr('width');
  const height = +chartEl.attr('height');
  const DAYS = 180; // six months

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

    scenarios.forEach(s => {
      const clicks = spend / cpc;
      const conversions = clicks * s.rate;
      const revenue = conversions * aov;
      const grossProfit = revenue - conversions * cogs;
      const dailyProfit = grossProfit - spend;
      s.roas = spend ? revenue / spend : 0;
      s.dailyProfit = dailyProfit;
      s.totalProfit = dailyProfit * DAYS;
      s.values = [];
      for (let day = 1; day <= DAYS; day++) {
        s.values.push({ day, profit: dailyProfit * day });
      }
    });


    resultsEl.innerHTML = `<table><tr><th>Scenario</th><th>ROAS</th><th>Daily Profit</th><th>6-Mo Profit</th></tr>${scenarios
      .map(s => `<tr><td>${s.name}</td><td>${s.roas.toFixed(2)}</td><td>${s.dailyProfit.toFixed(2)}</td><td>${s.totalProfit.toFixed(2)}</td></tr>`)
      .join('')}</table>`;

    // generate data series for cumulative profit
    const series = scenarios.map(s => ({ name: s.name, values: s.values }));

    // draw chart
    chartEl.selectAll('*').remove();
    const margin = { top: 20, right: 20, bottom: 30, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const x = d3.scaleLinear().domain([1, DAYS]).range([0, innerWidth]);
    const y = d3.scaleLinear()
      .domain([0, d3.max(series, s => d3.max(s.values, v => v.profit))])

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

