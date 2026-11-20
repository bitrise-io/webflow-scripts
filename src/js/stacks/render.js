// Pure rendering of stacks detail pages. Shared by the Cloudflare worker (server-side, so crawlers and the first
// paint get the full page) and the browser script (fallback when the page was not rendered by the worker).
// Must not touch `document` or import anything that needs a bundler loader (e.g. SVG icons).
import { escapeHtml, formatIsoDate } from '../shared/format';
import { LEGACY_STACKS_API_BASE, STACKS_API_BASE } from './config';

export { escapeHtml, formatIsoDate };

export const STACKS_SITE_URL = 'https://bitrise.io/stacks';

export const PAGE_TYPES = ['changelogs', 'announcements', 'tools', 'tips', 'stack_reports'];

/**
 * Format HTML content
 * @param {string} html
 * @returns {string}
 */
export const formatHtml = (html) =>
  html
    .replaceAll(
      '<summary>',
      `<summary>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M5.29291 10.2071L6.70712 8.79289L12 14.0858L17.2929 8.79289L18.7071 10.2071L12 16.9142L5.29291 10.2071Z" fill="currentColor"/>
    </svg>
  `,
    )
    .replaceAll(/\s+<\/code>/g, '</code>')
    .replaceAll(/href="\//g, 'href="/stacks/')
    .replaceAll(STACKS_API_BASE, '/stacks/')
    .replaceAll(LEGACY_STACKS_API_BASE, '/stacks/');

const stackFlavorDescriptions = {
  edge: 'Receives more frequent tool updates',
  stable: 'Receives regular updates',
  frozen: 'No longer receives updates',
};

/**
 * Render the badge of a stack flavor (edge, stable, frozen).
 * @param {string | null | undefined} flavor
 * @returns {string}
 */
export const renderStackFlavorBadge = (flavor) => {
  if (!stackFlavorDescriptions[flavor]) return '';
  return `<span class="stack-flavor-badge is-${flavor}" title="${stackFlavorDescriptions[flavor]}">${flavor}</span>`;
};

/**
 * Splits a page path into its page type and checks it points at a detail page ("changelogs/osx-xcode-26.0.x").
 * @param {string} pagePath
 * @returns {string | null} the page type, or null when it is not a detail page
 */
export const detailPageType = (pagePath) => {
  const [pageType, ...rest] = pagePath.split('/');
  return PAGE_TYPES.includes(pageType) && rest.join('/') !== '' ? pageType : null;
};

/**
 * Whether the page needs the stack removal date from the index to be rendered.
 * @param {string} pageType
 * @returns {boolean}
 */
export const needsRemovalDate = (pageType) => pageType === 'changelogs' || pageType === 'stack_reports';

/**
 * Looks up the removal date of the stack a changelog or stack report page belongs to.
 * @param {string} pagePath
 * @param {object | null | undefined} indexJson - the parsed stacks index.json
 * @returns {string | null} The formatted removal date or null if not available.
 */
export const findStackRemovalDate = (pagePath, indexJson) => {
  const stackReportsSection = indexJson?.sections?.find((section) => section.stack_reports);
  const stackReport = stackReportsSection?.stack_reports?.find(
    (report) => report.path === `/${pagePath.replace('changelogs/', 'stack_reports/')}`,
  );
  return stackReport?.stack_meta?.removal_date ? formatIsoDate(stackReport.stack_meta.removal_date) : null;
};

const stripTags = (text) => text.replace(/(<.*?>|\n)/g, '');

/**
 * Everything that makes up a rendered detail page.
 * @typedef {{
 *  title: string;
 *  description: string | null;
 *  canonical: string;
 *  titleHtml: string;
 *  metaHtml: string;
 *  contentHtml: string;
 * }} StacksPageView
 */

/**
 * Builds the page for a changelog, announcement, tool or tip.
 * @param {string} pagePath
 * @param {object} data - the page's index.json
 * @param {string | null} removalDate
 * @returns {StacksPageView}
 */
const buildContentPage = (pagePath, data, removalDate) => {
  const deprecationNotice = removalDate
    ? `<blockquote class="book-hint warning">
        ⚠️ &nbsp; This stack is deprecated and will be removed on ${removalDate}.
      </blockquote>`
    : '';
  const isChangelog = pagePath.startsWith('changelogs/');
  let description = null;
  if (isChangelog) description = `Last updated: ${formatIsoDate(data.updated_at)}`;
  else if (data.summary) description = stripTags(data.summary);

  return {
    title: `${data.title} | Bitrise Stack Updates`,
    description,
    canonical: `${STACKS_SITE_URL}/${pagePath}`,
    titleHtml: `${renderStackFlavorBadge(data.stack_flavor)}${data.title}`,
    metaHtml: formatIsoDate(data.updated_at),
    contentHtml: `${deprecationNotice}${formatHtml(data.content_html)}`,
  };
};

/**
 * @param {string} stackId
 * @returns {string}
 */
const changelogPathOf = (stackId) => {
  if (!stackId.match(/^aws/)) return `/stacks/changelogs/${stackId}`;
  if (stackId.match(/^aws-mac-virtualized/)) return '/stacks/changelogs/aws/aws-mac-virtualized';
  return `/stacks/changelogs/aws/${stackId}`;
};

/**
 * Builds the page for a stack report.
 * @param {string} pagePath
 * @param {object} data - the page's index.json
 * @param {string | null} removalDate
 * @param {{ github?: string, messageAlert?: string }} icons - inline SVGs, only available in the browser bundle
 * @returns {StacksPageView}
 */
const buildStackReportPage = (pagePath, data, removalDate, icons) => {
  const deprecationNotice = removalDate
    ? `<blockquote class="book-hint warning">
        ⚠️ This stack is deprecated and will be removed on ${removalDate}.
      </blockquote>`
    : '';
  const revision = data.stack_revision
    ? `Current stack revision: <code>${escapeHtml(data.stack_revision)}</code><br />`
    : '';

  return {
    title: `${data.stack_name} | Bitrise Stack Updates`,
    description: data.summary ? stripTags(data.summary) : null,
    canonical: `${STACKS_SITE_URL}/${pagePath}`,
    titleHtml: `${renderStackFlavorBadge(data.stack_flavor)}${data.stack_name}`,
    metaHtml: `Stack ID: <code>${escapeHtml(data.stack_id)}</code><br />${revision}<br />
      <span class="button-group">
        <a href="${changelogPathOf(data.stack_id)}" title="Changelog" class="button">Changelog</a>
        <a href="https://github.com/bitrise-io/stacks/commits/main/data/${escapeHtml(data.stack_id)}" target="_blank" title="Update history" data-icon="github" class="button is-secondary is-icon is-alternate">
          ${icons.github || ''}
          Update history
        </a>
        <a href="/stacks/tips/get-notified" title="Get notified" data-icon="messageAlert" class="button is-secondary is-icon is-alternate">
          ${icons.messageAlert || ''}
          Get notified
        </a>
      </span>
    `,
    contentHtml: `
      ${deprecationNotice}
      ${data.notice_html ? formatHtml(data.notice_html) : ''}
      <p>This Bitrise stack contains the following software:</p>
      ${formatHtml(data.content_html)}
    `,
  };
};

/**
 * Builds a detail page from its data.
 * @param {string} pagePath - e.g. "stack_reports/osx-xcode-26.0.x"
 * @param {object} data - the page's index.json
 * @param {object | null} indexJson - the stacks index.json, used for the removal date (changelogs, stack reports)
 * @param {{ github?: string, messageAlert?: string }} [icons]
 * @returns {StacksPageView}
 */
export const buildPage = (pagePath, data, indexJson, icons = {}) => {
  const isStackReport = detailPageType(pagePath) === 'stack_reports';
  // The frozen notice (changelogs) and notice_html (stack reports) already mention the removal date.
  const hasOwnNotice = isStackReport ? Boolean(data.notice_html) : data.stack_flavor === 'frozen';
  const removalDate =
    needsRemovalDate(detailPageType(pagePath)) && !hasOwnNotice ? findStackRemovalDate(pagePath, indexJson) : null;
  return isStackReport
    ? buildStackReportPage(pagePath, data, removalDate, icons)
    : buildContentPage(pagePath, data, removalDate);
};
