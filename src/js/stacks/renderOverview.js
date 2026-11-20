// Pure text rendering of the stacks overview page lists. Shared by the Cloudflare worker (server-side) and the
// browser script (fallback when the page was not rendered by the worker).
//
// The ids below (`w-node-…`) come from the Webflow template: its CSS positions the grid cells by id, so rows
// have to carry them to look right. Like the template rows they were cloned from, generated rows repeat them.
import { formatIsoDate } from './render';
import { awsIcon, ubuntuIcon, xcodeIcon } from './stackIcons';

const NODE = (id) => `w-node-${id}-efabba56`;

const XCODE_IDS = {
  stableOnly: {
    version: NODE('_88b826fb-619f-2c77-f503-30e918d6c46a'),
    links: NODE('_347b841b-ad31-5161-6ee9-ecfbbb6e2a0e'),
  },
  stableAndEdge: {
    version: NODE('_8240493f-543e-7b91-df74-345213b3090c'),
    links: NODE('_4660e14d-0827-9ea3-7656-e735d3c368f5'),
    edgeLinks: NODE('ff776ed1-49fa-4b94-6a76-4ebf4af7eb04'),
  },
  edgeOnly: {
    version: NODE('_2d2a4ad0-b2d2-c49d-0403-550ffff42bec'),
    links: NODE('_14d97d15-3192-41a4-ada6-b7954c744941'),
    edgeLinks: NODE('_49ef5578-94b3-57d9-00e2-a4f75cb0bc04'),
  },
  mobileOnly: {
    version: NODE('ef11b561-4fec-aace-a8c5-41846e2247f3'),
    links: NODE('ef11b561-4fec-aace-a8c5-41846e2247f7'),
  },
};
const UBUNTU_IDS = {
  row: NODE('_8201cc74-baa3-167d-a524-48948fb633fd'),
  version: NODE('_941736ed-1e88-acdf-6b99-6a45100872b0'),
};
const AWS_IDS = {
  row: NODE('_55a0a9e0-b5a7-6e79-413e-fa24983ef29d'),
  version: NODE('_55a0a9e0-b5a7-6e79-413e-fa24983ef29e'),
};

/**
 * The report / changelog links of a stack (the content of a `.stack-links` cell).
 * @param {[string, string, string] | undefined} reportsLink - [path, label, updated_at]
 * @param {[string, string, string] | undefined} changelogsLink
 * @param {string | null | undefined} deprecated - deprecation message
 * @returns {string}
 */
export const renderStackLinks = (reportsLink, changelogsLink, deprecated) => {
  const link = (cssClass, label, data) => {
    if (!data)
      return `<a href="#" class="${cssClass} w-inline-block" style="visibility: hidden"><div>${label}</div></a>`;
    const title = data[2] ? ` title="${formatIsoDate(data[2])}"` : '';
    return `<a href="/stacks${data[0]}" class="${cssClass} w-inline-block"${title} style="visibility: visible"><div>${label}</div></a>`;
  };
  const separatorStyle = reportsLink && changelogsLink ? '' : ' style="visibility: hidden"';
  const deprecatedMark = deprecated ? `<span title="${deprecated}" class="deprecated-stack">⚠️</span>` : '';
  return `${link('stack-link-reports', 'Report', reportsLink)}<div class="stack-links-separator"${separatorStyle}>|</div>${link('stack-link-changelogs', 'Changelog', changelogsLink)}${deprecatedMark}`;
};

const linksOf = (stack) => renderStackLinks(stack.stack_reports, stack.changelogs, stack.deprecated);

const versionCell = (id, icon, title, extraClass = '') =>
  `<div id="${id}" class="stack-version${extraClass}"><div class="stack-icon w-embed">${icon}</div><div class="stack-version-title">${title}</div></div>`;

const linksCell = (id, content, desktopOnly = false) =>
  `<div${id ? ` id="${id}"` : ''} class="stack-links${desktopOnly ? ' stack-links-desktop-only' : ''}">${content}</div>`;

const NO_LINKS = '–';

/**
 * @param {import('./StacksService').StacksLinks['xcode']} xcode
 * @returns {string} the rows of the Xcode list, without its header
 */
export const renderXcodeRows = (xcode) =>
  Object.keys(xcode)
    .sort()
    .reverse()
    .map((version) => {
      const { title, stable, edge } = xcode[version];
      if (!edge) {
        const ids = XCODE_IDS.stableOnly;
        return `<div class="stack-row">${versionCell(ids.version, xcodeIcon, title)}${linksCell(ids.links, linksOf(stable))}${linksCell(null, NO_LINKS, true)}</div>`;
      }

      const mobileTitle = stable ? `${title}<br />with edge updates` : `${title} (Edge version)`;
      const mobileIds = XCODE_IDS.mobileOnly;
      const mobileRow = `<div class="stack-row stack-row-mobile-only">${versionCell(mobileIds.version, xcodeIcon, mobileTitle)}${linksCell(mobileIds.links, linksOf(edge))}${linksCell(null, NO_LINKS, true)}</div>`;

      if (!stable) {
        const ids = XCODE_IDS.edgeOnly;
        const stableCell = version.match(/minimal/) ? NO_LINKS : 'Coming soon...';
        return `<div class="stack-row stack-row-desktop-only">${versionCell(ids.version, xcodeIcon, title)}${linksCell(ids.links, stableCell)}${linksCell(ids.edgeLinks, linksOf(edge), true)}</div>${mobileRow}`;
      }

      const ids = XCODE_IDS.stableAndEdge;
      return `<div class="stack-row stack-row-odd">${versionCell(ids.version, xcodeIcon, title)}${linksCell(ids.links, linksOf(stable))}${linksCell(ids.edgeLinks, linksOf(edge), true)}</div>${mobileRow}`;
    })
    .join('');

const singleColumnRow = (ids, icon, stack) =>
  `<div id="${ids.row}" class="stack-row">${versionCell(ids.version, icon, stack.title, ' stack-version-double')}${linksCell(null, linksOf(stack))}</div>`;

/**
 * @param {import('./StacksService').StacksLinks['ubuntu']} ubuntu
 * @returns {string} the rows of the Linux list, without its header
 */
export const renderUbuntuRows = (ubuntu) =>
  Object.keys(ubuntu)
    .sort()
    .reverse()
    .map((version) => singleColumnRow(UBUNTU_IDS, ubuntuIcon, ubuntu[version]))
    .join('');

const MACOS_NAMES = { tahoe: '16-', sonoma: '14-', ventura: '13-', sequoia: '15-' };
const numericAwsVersion = (version) =>
  Object.entries(MACOS_NAMES).reduce((result, [name, number]) => result.replace(name, number), version);

/**
 * @param {import('./StacksService').StacksLinks['aws']} aws
 * @returns {string} the rows of the AWS list, without its header
 */
export const renderAwsRows = (aws) =>
  Object.keys(aws)
    .sort((a, b) =>
      numericAwsVersion(a).localeCompare(numericAwsVersion(b), undefined, { numeric: true, sensitivity: 'base' }),
    )
    .reverse()
    .map((version) => singleColumnRow(AWS_IDS, awsIcon, aws[version]))
    .join('');

/**
 * @param {import('./StacksService').StacksLinks['announcements']} announcements
 * @returns {string} the items of the announcements list
 */
export const renderAnnouncements = (announcements) =>
  Object.values(announcements)
    .map(([path, title, date]) => {
      const dateHtml = date ? `<span class="changelog-date">${formatIsoDate(date)}</span>` : '';
      return `<li class="stacks-sidebar-list-item"><a href="/stacks${path}" class="text-color-inherit display-flex flex-direction-vertical"><span class="changelog-title">${title}</span>${dateHtml}</a></li>`;
    })
    .join('');

/**
 * @param {import('./StacksService').StacksLinks['tips']} tips
 * @returns {string} the items of the tips list
 */
export const renderTips = (tips) =>
  Object.values(tips)
    .map(
      ([path, title]) =>
        `<li class="stacks-sidebar-list-item"><a href="/stacks${path}" class="text-color-inherit">${title}</a></li>`,
    )
    .join('');

/**
 * Renders every list of the overview page.
 * @param {import('./StacksService').StacksLinks} stacksLinks
 * @returns {{ xcode: string, ubuntu: string, aws: string, announcements: string, tips: string }}
 */
export const renderOverview = (stacksLinks) => ({
  xcode: renderXcodeRows(stacksLinks.xcode),
  ubuntu: renderUbuntuRows(stacksLinks.ubuntu),
  aws: renderAwsRows(stacksLinks.aws),
  announcements: renderAnnouncements(stacksLinks.announcements),
  tips: renderTips(stacksLinks.tips),
});
