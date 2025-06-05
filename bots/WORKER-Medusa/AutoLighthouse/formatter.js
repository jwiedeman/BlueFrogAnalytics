// Use dynamic import to load the ESM-only @json2csv/node package when needed

function gatherPerformanceSuggestions(report) {
  const audits = Object.values(report.audits).filter(a => a.details && a.details.type === 'opportunity');
  const suggestions = audits.map(a => ({
    title: a.title,
    savings: a.details.overallSavingsMs || a.details.overallSavingsBytes || 0,
    displayValue: a.displayValue
  }))
  .sort((a, b) => b.savings - a.savings)
  .slice(0, 5)
  .map(a => `${a.title}${a.displayValue ? ` (${a.displayValue})` : ''}`);
  return suggestions.join('; ');
}

function gatherCategorySuggestions(report, categoryId) {
  const category = report.categories[categoryId];
  if (!category || !Array.isArray(category.auditRefs)) return '';
  const suggestions = category.auditRefs
    .map(ref => report.audits[ref.id])
    .filter(a => a && typeof a.score === 'number' && a.score < 1)
    .map(a => a.title);
  return suggestions.join('; ');
}

// -- CSV streaming helpers --
const headers = [
  'url', 'performance', 'accessibility', 'best-practices',
  'seo', 'pwa', 'firstContentfulPaint',
  'performanceSuggestions', 'accessibilitySuggestions', 'seoSuggestions'
];

function escapeCsv(val) {
  if (val == null) return '';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function getCsvHeader() {
  return headers.join(',');
}

function formatCsvLine({ url, report }) {
  const { categories, audits } = report;
  const data = {
    url,
    performance: categories.performance.score,
    accessibility: categories.accessibility.score,
    'best-practices': categories['best-practices'].score,
    seo: categories.seo.score,
    pwa: categories.pwa.score,
    firstContentfulPaint: audits['first-contentful-paint'].displayValue,
    performanceSuggestions: gatherPerformanceSuggestions(report),
    accessibilitySuggestions: gatherCategorySuggestions(report, 'accessibility'),
    seoSuggestions: gatherCategorySuggestions(report, 'seo')
  };
  return headers.map(h => escapeCsv(data[h])).join(',');
}

/**
 * Convert audit results to CSV format.
 * @param {Array<{url: string, report: object}>} results
 * @returns {string} CSV string
 */
function toCsv(results) {
  // Map results to flat rows
  const rows = results.map(({ url, report }) => {
    const { categories, audits } = report;
    return {
      url,
      performance: categories.performance.score,
      accessibility: categories.accessibility.score,
      'best-practices': categories['best-practices'].score,
      seo: categories.seo.score,
      pwa: categories.pwa.score,
      firstContentfulPaint: audits['first-contentful-paint'].displayValue,
      performanceSuggestions: gatherPerformanceSuggestions(report),
      accessibilitySuggestions: gatherCategorySuggestions(report, 'accessibility'),
      seoSuggestions: gatherCategorySuggestions(report, 'seo')
    };
  });
  // Define CSV headers in desired order
  const headers = [
    'url', 'performance', 'accessibility', 'best-practices',
    'seo', 'pwa', 'firstContentfulPaint',
    'performanceSuggestions', 'accessibilitySuggestions', 'seoSuggestions'
  ];
  // CSV-escape values
  const escape = (val) => {
    if (val == null) return '';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };
  // Build lines
  const lines = rows.map(row =>
    headers.map(h => escape(row[h])).join(',')
  );
  // Combine header and rows
  return [headers.join(','), ...lines].join('\n');
}

module.exports = { toCsv, getCsvHeader, formatCsvLine };
