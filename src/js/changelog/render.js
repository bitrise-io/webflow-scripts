// Pure rendering of the changelog pages. Shared by the Cloudflare worker (server-side, so crawlers and the first
// paint get the full page) and the browser script (search/filter re-rendering of the list).
// Must not touch `document`.
import { escapeHtml, summarizeHtml } from '../shared/format';

export const CHANGELOG_SITE_URL = 'https://bitrise.io/changelog';

export const DISCUSSION_URL = 'https://discuss.bitrise.io/t';

export const API_DOCS_URL = 'https://api.bitrise.io/release-management/api-docs/index.html';

/** Every tag the list can be filtered by; all of them are checked on a fresh page. */
export const ALL_TAGS = ['new-feature', 'feature-update', 'step-update', 'api-update', 'deprecation'];

// In the order the tag of a topic is picked: the first of these a topic has is the one shown.
const TAG_BADGES = [
  ['new-feature', 'is-purplefilled', '🎉 New feature'],
  ['feature-update', 'is-purple', 'Feature update'],
  ['step-update', 'is-blue', 'Step update'],
  ['api-update', 'is-green', 'API update'],
  ['deprecation', 'is-yellow', 'Deprecation'],
];

/**
 * @param {string[]} tags
 * @returns {string} the badge of the topic's most important tag, or an empty string
 */
export const renderTopicTag = (tags) => {
  const badge = TAG_BADGES.find(([tag]) => tags.includes(tag));
  return badge ? `<div class="tag is-small ${badge[1]}">${badge[2]}</div>` : '';
};

/**
 * @param {import('./ChangelogTopic').default} topic
 * @param {boolean} isUnread
 * @returns {string}
 */
export const renderListItem = (topic, isUnread) => {
  const linkClass = isUnread
    ? 'changelog-unread text-weight-medium text-color-neutral10'
    : 'changelog-read text-color-neutral40';
  const timestampClass = isUnread
    ? 'text-color-neutral70 text-size-small changelog-timestamp'
    : 'text-size-small text-color-neutral70 changelog-timestamp';
  const bulletClass = isUnread ? 'changelog-bullet changelog-bullet-new' : 'changelog-bullet';
  return `<li class="changelog-list-item"><a href="${topic.webflowUrl()}" class="${linkClass} w-inline-block"><div class="${timestampClass}">${topic.createdDate}</div><div class="display-flex align-items-center flex-gap-0-5rem"><div class="changelog-bullet-container"><div class="${bulletClass}"></div></div>${renderTopicTag(topic.tags)}<div class="changelog-title">${topic.fancyTitle}</div></div></a></li>`;
};

/**
 * Renders the changelog list: topics grouped under their date, unread ones highlighted.
 * @param {import('./ChangelogTopic').default[]} topics
 * @param {Date} lastVisitedDate - topics created after this are unread
 * @param {{ search?: string, showTags?: string[] }} [filters]
 * @returns {string}
 */
export const renderList = (topics, lastVisitedDate, filters = {}) => {
  let timestamp = null;
  const items = [];
  topics.forEach((topic) => {
    if (filters.search && !topic.title.toLowerCase().includes(filters.search.toLowerCase())) return;
    if (filters.showTags && !topic.tags.some((tag) => filters.showTags.includes(tag))) return;

    if (timestamp !== topic.createdDate) {
      timestamp = topic.createdDate;
      items.push(`<li class="changelog-group-timestamp text-color-neutral40 text-size-medium">${timestamp}</li>`);
    }
    items.push(renderListItem(topic, topic.createdAt.getTime() > lastVisitedDate.getTime()));
  });
  return items.join('') || '<li class="changelog-no-results">Nothing matches the filters</li>';
};

// A Discourse lightbox is an image wrapped in a link plus a caption bar; the page only wants the image.
const LIGHTBOX =
  /<div class="lightbox-wrapper"><a[^>]*>\s*(<img[^>]*>)(?:\s*<div class="meta">[\s\S]*?<\/div>)?\s*<\/a>\s*<\/div>/g;

/**
 * @param {string} html
 * @returns {string}
 */
export const unwrapLightboxes = (html) => html.replace(LIGHTBOX, '<figure>$1</figure>');

/**
 * Everything that makes up a rendered topic page.
 * @typedef {{
 *  title: string;
 *  description: string;
 *  canonical: string;
 *  titleHtml: string;
 *  metaHtml: string;
 *  tagHtml: string;
 *  contentHtml: string;
 *  isApiTopic: boolean;
 *  footerText: string | null;
 *  feedbackUrl: string;
 *  feedbackLabel: string | null;
 * }} ChangelogTopicView
 */

/**
 * @param {import('./ChangelogTopic').default} topic
 * @returns {ChangelogTopicView}
 */
export const buildTopicPage = (topic) => {
  const isApiTopic = topic.id === 0;
  const { content } = topic;
  return {
    title: `${topic.title} | Bitrise Changelog`,
    description: summarizeHtml(content),
    canonical: `${CHANGELOG_SITE_URL}/${topic.slug}${isApiTopic ? '' : `/${topic.id}`}`,
    titleHtml: topic.fancyTitle,
    metaHtml: topic.createdDate,
    tagHtml: renderTopicTag(topic.tags),
    contentHtml: unwrapLightboxes(content),
    isApiTopic,
    footerText: isApiTopic ? 'Read more on Release Management API' : null,
    feedbackUrl: isApiTopic ? API_DOCS_URL : `${DISCUSSION_URL}/${topic.slug}/${topic.id}`,
    feedbackLabel: isApiTopic ? 'API Documentation' : null,
  };
};

/**
 * Meta tags the template does not have, for the head of a topic page.
 * @param {string} description
 * @returns {string}
 */
export const renderDescriptionMeta = (description) => {
  if (!description) return '';
  const content = escapeHtml(description);
  return `<meta name="description" content="${content}"><meta property="og:description" content="${content}"><meta name="twitter:description" content="${content}">`;
};

/**
 * Works out what a /changelog/<...> path refers to.
 * - rm-v1-12112026092805: a Release Management API entry, which lives in changelog.json instead of Discourse
 * - some-slug/12345: a Discourse topic
 * @param {string} topicPath - everything after "/changelog/"
 * @returns {{ kind: 'api' | 'discourse', slug: string, path: string } | null} null for anything else
 */
export const parseTopicPath = (topicPath) => {
  const path = topicPath.replace(/\/$/, '');
  if (path.match(/^rm-v\d+-[\w-]*(\/0)?$/)) {
    return { kind: 'api', slug: path.replace(/\/0$/, ''), path };
  }
  const match = path.match(/^([\w.-]+)(?:\/(\d+))?$/);
  if (!match || match[1] === '.' || match[1] === '..') return null;
  return { kind: 'discourse', slug: match[1], path };
};
