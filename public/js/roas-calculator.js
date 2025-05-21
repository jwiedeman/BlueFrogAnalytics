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

    scenarios.forEach(s => {
      const clicks = spend / cpc;
      const conversions = clicks * s.rate;
      const revenue = conversions * aov;
      const grossProfit = revenue - conversions * cogs;
      const netProfit = grossProfit - spend;
      s.conversions = conversions;
      s.revenue = revenue;
      s.netProfit = netProfit;
      s.roas = spend ? revenue / spend : 0;
    });

    resultsEl.innerHTML = `<table><tr><th>Scenario</th><th>ROAS</th><th>Profit</th></tr>${scenarios
      .map(s => `<tr><td>${s.name}</td><td>${s.roas.toFixed(2)}</td><td>${s.netProfit.toFixed(2)}</td></tr>`) 
      .join('')}</table>`;

    // draw chart
    chartEl.selectAll('*').remove();
    const margin = {top: 20, right: 20, bottom: 30, left: 40};
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const x = d3.scaleBand().domain(scenarios.map(s => s.name)).range([0, innerWidth]).padding(0.2);
    const y = d3.scaleLinear().domain([d3.min(scenarios, s => s.netProfit), d3.max(scenarios, s => s.netProfit)]).nice().range([innerHeight, 0]);
    const g = chartEl.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    g.append('g').call(d3.axisLeft(y));
    g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x));
    g.selectAll('rect')
      .data(scenarios)
      .enter()
      .append('rect')
      .attr('x', d => x(d.name))
      .attr('y', d => y(Math.max(0, d.netProfit)))
      .attr('height', d => Math.abs(y(d.netProfit) - y(0)))
      .attr('width', x.bandwidth())
      .attr('fill', '#69b3a2');
  });
});

