window.addEventListener('load', () => {
  const form = document.getElementById('roas-form');
  const exportBtn = document.getElementById('export');
  const resultsEl = document.getElementById('roas-results');
  const chartEl = d3.select('#roas-chart');
  const width = +chartEl.attr('width');
  const height = +chartEl.attr('height');

  const subFields = document.querySelector('.sub-fields');
  const svcFields = document.querySelector('.svc-fields');
  const toggleFields = () => {
    const subOn = document.getElementById('subscription').checked;
    const svcOn = document.getElementById('service').checked;
    subFields.style.display = subOn ? 'flex' : 'none';
    svcFields.style.display = svcOn ? 'flex' : 'none';
    subFields.querySelectorAll('input').forEach(i => (i.disabled = !subOn));
    svcFields.querySelectorAll('input').forEach(i => (i.disabled = !svcOn));
  };
  document.getElementById('subscription').addEventListener('change', () => {
    toggleFields();
    calculate();
  });
  document.getElementById('service').addEventListener('change', () => {
    toggleFields();
    calculate();
  });
  toggleFields();

  let lastScenarios = [];

  const calculate = () => {
    const aov = parseFloat(document.getElementById('aov').value) || 0;
    const subOn = document.getElementById('subscription').checked;
    const subPrice = parseFloat(document.getElementById('sub-price').value) || 0;
    const subLife = parseFloat(document.getElementById('sub-life').value) || 0;
    const svcOn = document.getElementById('service').checked;
    const svcPrice = parseFloat(document.getElementById('svc-price').value) || 0;
    const svcLen = parseFloat(document.getElementById('svc-len').value) || 0;

    const cogs = parseFloat(document.getElementById('cogs').value) || 0;
    const spend = parseFloat(document.getElementById('spend').value) || 0;
    const cpc = parseFloat(document.getElementById('cpc').value) || 0.01;
    const ctr = parseFloat(document.getElementById('ctr').value) / 100 || 0;
    const cvr = parseFloat(document.getElementById('cvr').value) / 100 || 0;
    const l2c = parseFloat(document.getElementById('l2c').value) / 100 || 0;
    const team = parseFloat(document.getElementById('team').value) || 0;
    const tools = parseFloat(document.getElementById('tools').value) || 0;
    const fulfill = parseFloat(document.getElementById('fulfill').value) || 0;

    const ltvPerSale = aov + (subOn ? subPrice * subLife : 0) + (svcOn ? svcPrice * svcLen : 0);
    const ltcMultiplier = svcOn ? l2c : 1;

    const scenarios = [
      { name: 'Worst', factor: 0.8 },
      { name: 'Probable', factor: 1.0 },
      { name: 'Best', factor: 1.2 }
    ];

    const maxSpend = spend * 1.5;
    const steps = 20;

    scenarios.forEach(s => {
      const cvRate = cvr * s.factor;
      const points = [];
      for (let i = 0; i <= steps; i++) {
        const sp = (maxSpend / steps) * i;
        const clicks = sp / cpc;
        const leads = clicks * ctr;
        const conversions = leads * cvRate * ltcMultiplier;
        const revenue = conversions * ltvPerSale;
        const cogTotal = conversions * cogs;
        const profit = revenue - sp - team - tools - fulfill - cogTotal;
        points.push({ spend: sp, profit });
      }
      const clicks = spend / cpc;
      const leads = clicks * ctr;
      const conversions = leads * cvRate * ltcMultiplier;
      const revenue = conversions * ltvPerSale;
      const cogTotal = conversions * cogs;
      s.roas = spend ? revenue / spend : 0;
      s.cac = conversions ? spend / conversions : 0;
      s.breakeven = spend ? (spend + team + tools + fulfill + cogTotal) / spend : 0;
      s.profit = revenue - spend - team - tools - fulfill - cogTotal;
      s.ltvCac = s.cac ? ltvPerSale / s.cac : 0;
      s.points = points;
    });

    lastScenarios = scenarios;

    const rows = scenarios.map(s => `
      <tr><td>${s.name}</td><td>${s.roas.toFixed(2)}</td><td>${s.cac.toFixed(2)}</td><td>${s.breakeven.toFixed(2)}</td><td>${s.profit.toFixed(2)}</td><td>${s.ltvCac.toFixed(2)}</td></tr>`).join('');

    resultsEl.innerHTML = `<table class="bx--data-table bx--data-table--compact"><thead><tr><th>Scenario</th><th>ROAS</th><th>CAC</th><th>Breakeven ROAS</th><th>Profit</th><th>LTV/CAC</th></tr></thead><tbody>${rows}</tbody></table>`;

    drawChart(scenarios);
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    calculate();
  });

  form.querySelectorAll("input").forEach(i => {
    i.addEventListener("input", calculate);
  });

  calculate();


  function drawChart(scenarios) {
    chartEl.selectAll('*').remove();
    const margin = { top: 20, right: 20, bottom: 30, left: 50 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const x = d3.scaleLinear().domain([0, d3.max(scenarios[0].points, d => d.spend)]).range([0, innerWidth]);
    const y = d3.scaleLinear()
      .domain([
        d3.min(scenarios, s => d3.min(s.points, p => p.profit)),
        d3.max(scenarios, s => d3.max(s.points, p => p.profit))
      ])
      .nice()
      .range([innerHeight, 0]);

    const line = d3.line()
      .x(d => x(d.spend))
      .y(d => y(d.profit));

    const g = chartEl.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    g.append('g').attr('transform', `translate(0,${innerHeight})`).call(d3.axisBottom(x));
    g.append('g').call(d3.axisLeft(y));

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    scenarios.forEach((s, idx) => {
      g.append('path')
        .datum(s.points)
        .attr('fill', 'none')
        .attr('stroke', color(idx))
        .attr('stroke-width', 2)
        .attr('d', line);
    });
  }

  exportBtn.addEventListener('click', () => {
    if (!lastScenarios.length) return;
    const header = 'Scenario,ROAS,CAC,BreakevenROAS,Profit,LTV/CAC\n';
    const csv = header + lastScenarios.map(s => `${s.name},${s.roas.toFixed(2)},${s.cac.toFixed(2)},${s.breakeven.toFixed(2)},${s.profit.toFixed(2)},${s.ltvCac.toFixed(2)}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'roas-results.csv';
    link.click();
  });
});
