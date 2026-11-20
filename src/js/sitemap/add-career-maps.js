/**
 * Adds the career map level pages to the sitemap the crawler made. The pages are not linked from anywhere the crawler
 * can follow, but the career maps SSR job publishes the list of them (career-maps-pages.json).
 *
 * Usage: node add-career-maps.js <sitemap.xml> [pages-url]
 * Pages already in the sitemap are left alone. A list that cannot be loaded fails the job, so a sitemap without the
 * pages is never uploaded by mistake.
 */
const fs = require('fs');

const PAGES_URL = 'https://web-cdn.bitrise.io/webflow-ssr/career-maps-pages.json';
const MAPS_URL = 'https://bitrise.io/careers/maps/';

/**
 * @param {string} sitemap
 * @param {string[]} pages Paths below /careers/maps/, like engineering/software-engineer/p2
 * @returns {{ sitemap: string, added: number }}
 */
function addPages(sitemap, pages) {
  const missing = pages.map((page) => `${MAPS_URL}${page}`).filter((url) => !sitemap.includes(`<loc>${url}</loc>`));
  const entries = missing.map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>\n`).join('');
  return { sitemap: sitemap.replace('</urlset>', `${entries}</urlset>`), added: missing.length };
}

/** Reads the page list and adds the pages to the sitemap file given on the command line. */
async function main() {
  const [file, pagesUrl = PAGES_URL] = process.argv.slice(2);
  if (!file) throw new Error('Usage: node add-career-maps.js <sitemap.xml> [pages-url]');

  const response = await fetch(pagesUrl);
  if (!response.ok) throw new Error(`${pagesUrl} answered ${response.status}`);
  const { pages } = await response.json();
  if (!Array.isArray(pages) || pages.length === 0) throw new Error(`${pagesUrl} lists no pages`);

  const { sitemap, added } = addPages(fs.readFileSync(file, 'utf8'), pages);
  fs.writeFileSync(file, sitemap);
  process.stdout.write(`Added ${added} of ${pages.length} career map pages to ${file}\n`);
}

if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  });
}

module.exports = { addPages };
