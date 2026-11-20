import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { JSDOM } from 'jsdom';
import { compactCareerMaps, listPages, pageIndex, prepareCareerMaps } from './pages';
import { applyPageMeta, levelPageMeta, markCareerMapsRendered, renderOverview, renderTeamPage } from './render';

const PUBLISHED_DATA_URL = 'https://web-cdn.bitrise.io/career-maps.json';

/**
 * Fetches a page template. Fails on anything but a successful HTML answer, so an error or maintenance page is never
 * rendered and uploaded over the published pages.
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchTemplate(url) {
  const response = await fetch(url);
  const contentType = response.headers.get('Content-Type') || '';
  if (!response.ok || !contentType.includes('text/html')) {
    throw new Error(`Template ${url} could not be loaded: ${response.status} ${contentType}`);
  }
  return response.text();
}

/**
 * The career maps data: the file the generator job has just written, or the published one when there is none
 * (local runs).
 * @param {string} dataPath
 * @returns {Promise<import('../career-maps').Department[]>}
 */
async function loadCareerMaps(dataPath) {
  let departments;
  try {
    departments = JSON.parse(await fs.readFile(dataPath, 'utf8'));
    process.stdout.write(`Read ${dataPath}\n`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const response = await fetch(PUBLISHED_DATA_URL);
    if (!response.ok) throw new Error(`${PUBLISHED_DATA_URL} could not be loaded: ${response.status}`);
    departments = await response.json();
    process.stdout.write(`Read ${PUBLISHED_DATA_URL}\n`);
  }
  if (!Array.isArray(departments) || !departments.some((department) => department.teams && department.teams.length)) {
    throw new Error('The career maps data has no teams');
  }
  return departments;
}

/**
 * @param {string} path
 * @param {string} content
 */
async function writeFile(path, content) {
  await fs.mkdir(dirname(path), { recursive: true });
  await fs.writeFile(path, content);
}

/**
 * Writes, under `destination` (the same layout as in the webflow-ssr folder of the bucket):
 * - careers/maps.html: the overview page
 * - careers/maps/<team>/<job>/<level>.html: one page per level
 * - career-maps-data.json: the data without the Confluence links and parser warnings, for the browser script
 * - career-maps-pages.json: the paths of the level pages, and where the shorter paths lead, for the worker
 * @param {{ destination: string, templateHostname: string, dataPath?: string }} options
 */
export async function render({ destination, templateHostname, dataPath = './career-maps.json' }) {
  const [overviewTemplate, teamTemplate, data] = await Promise.all([
    fetchTemplate(`https://${templateHostname}/careers/maps?template=true`),
    fetchTemplate(`https://${templateHostname}/careers/maps/team?template=true`),
    loadCareerMaps(dataPath),
  ]);
  const compactData = compactCareerMaps(data);
  const departments = prepareCareerMaps(compactData);
  const pages = listPages(departments);

  const overviewDom = new JSDOM(overviewTemplate, { url: 'https://bitrise.io/careers/maps' });
  renderOverview(overviewDom.window.document, departments);
  markCareerMapsRendered(overviewDom.window.document);
  await writeFile(join(destination, 'careers', 'maps.html'), overviewDom.serialize());

  await Promise.all(
    pages.map(async (page) => {
      const url = `https://bitrise.io/careers/maps/${page.path}`;
      const dom = new JSDOM(teamTemplate, { url });
      const doc = dom.window.document;
      renderTeamPage(doc, page);
      applyPageMeta(doc, levelPageMeta(page));
      markCareerMapsRendered(doc);
      await writeFile(join(destination, 'careers', 'maps', `${page.path}.html`), dom.serialize());
    }),
  );

  await writeFile(join(destination, 'career-maps-data.json'), JSON.stringify(compactData));
  await writeFile(join(destination, 'career-maps-pages.json'), JSON.stringify(pageIndex(departments)));

  process.stdout.write(`Career maps SSR: rendered careers/maps.html + ${pages.length} level pages\n`);
}
