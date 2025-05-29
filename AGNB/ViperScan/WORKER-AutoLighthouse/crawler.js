const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

async function crawlSite(baseUrl) {
  const visited = new Set();
  const toVisit = [baseUrl];
  const baseHost = new URL(baseUrl).hostname;
  while (toVisit.length) {
    const url = toVisit.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    try {
      const res = await axios.get(url);
      const $ = cheerio.load(res.data);
      $('a[href]').each((i, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        try {
          const absolute = new URL(href, baseUrl).toString();
          if (new URL(absolute).hostname === baseHost && !visited.has(absolute)) {
            toVisit.push(absolute);
          }
        } catch {}
      });
    } catch (e) {
      console.warn(`Failed to fetch ${url}: ${e.message}`);
    }
  }
  return Array.from(visited);
}

module.exports = { crawlSite };