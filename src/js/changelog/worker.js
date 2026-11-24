/* global HTMLRewriter */
import ChangelogTopic from './ChangelogTopic';
import { fetchWithTimeout } from './fetchWithTimeout';
import { CHANGELOG_CATEGORY_ID, fetchDiscourseTopic, isListedInChangelog } from './discourse';
import { resolveLastVisit } from './lastVisit';
import { ALL_TAGS, buildTopicPage, parseTopicPath, renderDescriptionMeta, renderList } from './render';

const ORIGIN_HOST = 'bitrise.io';
const CDN_HOST = 'web-cdn.bitrise.io';

// Browsers and the edge may keep a rendered topic for a few minutes.
const TOPIC_MAX_AGE_SECONDS = 300;
const UPSTREAM_CACHE_TTL_SECONDS = 300;

// The full changelog (all topics, ~1 MB) is read for Release Management API entries and to recognise topics of the
// changelog subcategories. Keep the parsed copy around in this isolate so it is not parsed again for every request.
const FULL_CHANGELOG_TTL_MS = 5 * 60 * 1000;
let fullChangelog = { loadedAt: 0, json: null };

const setCorsHeaders = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.append('Vary', 'Origin');
  return response;
};

const fetchJson = async (url) => {
  try {
    const response = await fetchWithTimeout(url, {
      cf: { cacheTtl: UPSTREAM_CACHE_TTL_SECONDS, cacheEverything: true },
    });
    return response.ok ? await response.json() : null;
  } catch (error) {
    return null;
  }
};

const loadFullChangelog = async () => {
  if (fullChangelog.json && Date.now() - fullChangelog.loadedAt < FULL_CHANGELOG_TTL_MS) return fullChangelog.json;
  const json = await fetchJson(`https://${CDN_HOST}/changelog.json`);
  if (json) fullChangelog = { loadedAt: Date.now(), json };
  // A failed refresh keeps serving the previous copy.
  return json || fullChangelog.json;
};

// An upstream did not answer in time or is unusable: an error, never cached, and not a missing page.
const errorResponse = (status, text) => new Response(text, { status, headers: { 'Cache-Control': 'no-store' } });

// The generic bitrise.io 404 page, served with a real 404 status.
// reason is sent as X-Proxy-404-Reason, so a 404 can be traced without the worker's logs.
const notFoundResponse = async (reason) => {
  let body = 'Not found';
  try {
    body = (await fetchWithTimeout(`https://${ORIGIN_HOST}/404`)).body;
  } catch (error) {
    // the generic page is unavailable; a plain 404 is still correct
  }
  return new Response(body, {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Proxy-404-Reason': reason },
  });
};

// The page template from the origin; null when it cannot be loaded in time.
const fetchTemplate = async (url) => {
  try {
    return await fetchWithTimeout(url);
  } catch (error) {
    console.log('template fetch failed', String(error)); // eslint-disable-line no-console
    return null;
  }
};

const isHtml = (response) => (response.headers.get('Content-Type') || '').includes('text/html');

const setAttr = (name, value) => ({
  element: (element) => element.setAttribute(name, value),
});

const templateUrl = (urlObject, pathname) => {
  const url = new URL(urlObject);
  url.hostname = ORIGIN_HOST;
  url.pathname = pathname;
  return url;
};

/**
 * The list page: the latest topics, rendered with the unread state of this visitor (from their cookie).
 * The browser script takes over for search, filters and loading more.
 * @param {Request} request
 * @param {URL} urlObject
 * @returns {Promise<Response>}
 */
const renderListPage = async (request, urlObject) => {
  const [template, latest] = await Promise.all([
    fetchTemplate(templateUrl(urlObject, '/changelog')),
    fetchJson(`https://${CDN_HOST}/changelog_latest.json`),
  ]);
  if (!template) return errorResponse(504, 'Upstream timeout');
  // Without the data the browser script loads the list itself, as before.
  if (!template.ok || !isHtml(template) || !latest) return template;

  const { lastVisitDate } = resolveLastVisit({
    cookieHeader: request.headers.get('Cookie') || '',
    overrideDays: urlObject.searchParams.get('lastVisit'),
  });
  const topics = latest.topic_list.topics.map((data) => new ChangelogTopic(data));
  const listHtml = renderList(topics, lastVisitDate, { showTags: ALL_TAGS });

  const rewriter = new HTMLRewriter().on('#changelog-list', {
    element: (element) => {
      // Tells the browser script that the list is already in place.
      element.setAttribute('data-ssr', 'true');
      element.setInnerContent(listHtml, { html: true });
    },
  });

  const response = new Response(rewriter.transform(template).body, template);
  response.headers.delete('Content-Length');
  // Depends on the visitor's cookie: must not be shared.
  response.headers.set('Cache-Control', 'private, max-age=0');
  response.headers.set('Vary', 'Cookie');
  return response;
};

const renderTopicPage = (template, topic, cacheStatus) => {
  const view = buildTopicPage(topic);
  const rewriter = new HTMLRewriter()
    .on('title', { element: (element) => element.setInnerContent(view.title) })
    .on('link[rel="canonical"]', setAttr('href', view.canonical))
    .on('meta[property="og:title"]', setAttr('content', view.title))
    .on('meta[name="twitter:title"]', setAttr('content', view.title))
    .on('head', {
      element: (element) => element.append(renderDescriptionMeta(view.description), { html: true }),
    })
    .on('#changelog-topic-title', { element: (element) => element.setInnerContent(view.titleHtml, { html: true }) })
    .on('#changelog-topic-meta', { element: (element) => element.setInnerContent(view.metaHtml, { html: true }) })
    // The template shows one sample of every tag; keep only the one of this topic, in front of the separator.
    .on(
      '#changelog-tag-purple-filled, #changelog-tag-purple, #changelog-tag-blue, #changelog-tag-green, #changelog-tag-yellow',
      { element: (element) => element.remove() },
    )
    .on('#changelog-topic-meta-separator', {
      element: (element) => {
        if (view.tagHtml) element.before(view.tagHtml, { html: true });
        element.setAttribute('style', view.tagHtml ? 'display: block' : 'display: none');
      },
    })
    .on('#changelog-topic-content', {
      element: (element) => {
        // Tells the browser script that the content is already in place, and what it still has to enhance.
        element.setAttribute('data-ssr', 'true');
        element.setAttribute('data-topic-kind', view.isApiTopic ? 'api' : 'discourse');
        element.setInnerContent(view.contentHtml, { html: true });
      },
    })
    .on('#changelog-topic-leave-feedback-button', {
      element: (element) => {
        element.setAttribute('href', view.feedbackUrl);
        element.setAttribute('target', '_blank');
        if (view.feedbackLabel) element.setInnerContent(view.feedbackLabel);
      },
    });
  if (view.footerText) {
    rewriter.on('.changelog-topic-footer > div:first-child', {
      element: (element) => element.setInnerContent(view.footerText),
    });
  }

  const response = new Response(rewriter.transform(template).body, template);
  response.headers.delete('Content-Length');
  response.headers.set('Cache-Control', `public, max-age=${TOPIC_MAX_AGE_SECONDS}`);
  response.headers.set('X-Proxy-Cache', cacheStatus);
  return response;
};

/**
 * A topic page: the worker reads the topic (Discourse, or changelog.json for Release Management API entries)
 * and renders it into the template. A topic that cannot be loaded is a 404.
 * @param {URL} urlObject
 * @param {object} env - the worker bindings (KV namespace, Discourse credentials)
 * @param {{ waitUntil: (promise: Promise<unknown>) => void }} ctx
 * @returns {Promise<Response>}
 */
const handleTopic = async (urlObject, env, ctx) => {
  let topicPath = urlObject.pathname.replace(/^\/changelog\//, '');
  // Link of the form /changelog/topic?topic=<slug>/<id>, used where there is no worker in front of the page
  if (topicPath === 'topic') topicPath = urlObject.searchParams.get('topic') || '';

  const parsed = parseTopicPath(topicPath);
  if (!parsed) return notFoundResponse('bad-path');

  const loadTopic = async () => {
    if (parsed.kind === 'api') {
      const json = await loadFullChangelog();
      const data = json && json.topic_list.topics.find((topic) => topic.id === 0 && topic.slug === parsed.slug);
      return { topic: data || null, cacheStatus: 'CDN' };
    }
    return fetchDiscourseTopic(parsed.path, env, ctx);
  };

  const [template, { topic, cacheStatus }] = await Promise.all([
    fetchTemplate(templateUrl(urlObject, '/changelog/topic')),
    loadTopic(),
  ]);
  if (!template) return errorResponse(504, 'Upstream timeout');
  if (!topic) return notFoundResponse('topic-not-found');
  if (!template.ok || !isHtml(template)) return notFoundResponse(`template-${template.status}`);
  // Any Discourse topic can be asked for by id; only changelog posts are pages here. Topics of the changelog
  // category are; those of its subcategories are recognised by being in the generated changelog.json.
  if (parsed.kind === 'discourse' && topic.category_id !== CHANGELOG_CATEGORY_ID) {
    const changelog = await loadFullChangelog();
    if (!changelog) return errorResponse(503, 'Changelog unavailable');
    if (!isListedInChangelog(topic, changelog)) return notFoundResponse(`category-${topic.category_id}`);
  }

  return renderTopicPage(template, new ChangelogTopic(topic), cacheStatus);
};

export default {
  async fetch(request, env, ctx) {
    const urlObject = new URL(request.url);

    if (urlObject.pathname.match(/^\/changelog-proxy$/)) {
      return setCorsHeaders(new Response('OK'));
    }

    // Static files the build job publishes next to the site: the topic lists the list page loads and filters,
    // and the RSS feed.
    const staticFiles = {
      '/changelog.json': { file: 'changelog.json', cors: true },
      '/changelog_latest.json': { file: 'changelog_latest.json', cors: true },
      '/changelog.xml': { file: 'changelog.xml', cors: false },
    };
    const staticFile = staticFiles[urlObject.pathname];
    if (staticFile) {
      // The query string (clients add a cache buster) is passed on, as it always was
      let upstream;
      try {
        upstream = await fetchWithTimeout(`https://${CDN_HOST}/${staticFile.file}${urlObject.search}`);
      } catch (error) {
        return errorResponse(504, 'Upstream timeout');
      }
      const response = new Response(upstream.body, upstream);
      return staticFile.cors ? setCorsHeaders(response) : response;
    }

    if (urlObject.pathname.match(/^\/changelog\/?$/)) {
      return renderListPage(request, urlObject);
    }

    if (urlObject.pathname.match(/^\/changelog\/.+/)) {
      return handleTopic(urlObject, env, ctx);
    }

    urlObject.hostname = ORIGIN_HOST;
    return fetch(urlObject);
  },
};
