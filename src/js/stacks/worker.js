/* global HTMLRewriter */
import { STACKS_API_BASE } from './config';
import StacksService from './StacksService';
import { buildPage, detailPageType, needsRemovalDate } from './render';
import { renderOverview } from './renderOverview';

const ORIGIN_HOST = 'bitrise.io';

// The page content lives in the HTML now, so browsers and the edge must not hold on to it for long.
const PAGE_MAX_AGE_SECONDS = 300;
const UPSTREAM_CACHE_TTL_SECONDS = 300;

const setCorsHeaders = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.append('Vary', 'Origin');
  return response;
};

// The generic bitrise.io 404 page, served with a real 404 status.
const notFoundResponse = async () => {
  const response = await fetch(`https://${ORIGIN_HOST}/404`);
  return new Response(response.body, {
    status: 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};

const fetchStacksJson = async (path) => {
  try {
    const response = await fetch(`${STACKS_API_BASE}${path}`, {
      cf: { cacheTtl: UPSTREAM_CACHE_TTL_SECONDS, cacheEverything: true },
    });
    return response.ok ? await response.json() : null;
  } catch (error) {
    return null;
  }
};

const setAttr = (name, value) => ({
  element: (element) => element.setAttribute(name, value),
});

// Fills the template with the page content, so crawlers and the first paint get the real page instead of
// an empty shell that the browser script fills in later.
const renderDetailPage = (templateResponse, view) => {
  const rewriter = new HTMLRewriter()
    .on('title', { element: (element) => element.setInnerContent(view.title) })
    .on('link[rel="canonical"]', setAttr('href', view.canonical))
    .on('#stacks-title', {
      element: (element) => {
        element.setAttribute('style', 'text-wrap: balance');
        element.setInnerContent(view.titleHtml, { html: true });
      },
    })
    .on('#stacks-meta', { element: (element) => element.setInnerContent(view.metaHtml, { html: true }) })
    .on('#stacks-content', {
      element: (element) => {
        // Tells the browser script that the content is already in place.
        element.setAttribute('data-ssr', 'true');
        element.setInnerContent(view.contentHtml, { html: true });
      },
    });

  const metaTags = [
    ['name', 'description', view.description],
    ['property', 'og:title', view.title],
    ['property', 'og:description', view.description],
    ['name', 'twitter:title', view.title],
    ['name', 'twitter:description', view.description],
  ];
  metaTags.forEach(([key, value, content]) => {
    if (content) rewriter.on(`meta[${key}="${value}"]`, setAttr('content', content));
  });

  const response = new Response(rewriter.transform(templateResponse).body, templateResponse);
  response.headers.delete('Content-Length');
  response.headers.set('Cache-Control', `public, max-age=${PAGE_MAX_AGE_SECONDS}`);
  return response;
};

// Fills the lists of the overview page, replacing the placeholder rows of the Webflow template.
const renderOverviewPage = (templateResponse, indexJson) => {
  const overview = renderOverview(new StacksService().parseStacksIndexJson(indexJson));
  let headingIndex = 0;

  const rewriter = new HTMLRewriter()
    // The second section heading is "Ubuntu" in the template, the page calls it "Linux".
    .on('h3.stacks-heading-h3', {
      element: (element) => {
        headingIndex += 1;
        if (headingIndex === 2) element.setInnerContent('Linux');
      },
    })
    .on('#announcement-list', { element: (element) => element.setInnerContent(overview.announcements, { html: true }) })
    .on('#stack-tips', { element: (element) => element.setInnerContent(overview.tips, { html: true }) });

  // Header rows stay; the template rows are removed and the rendered ones appended.
  [
    ['#xcode-stack-list', overview.xcode],
    ['#ubuntu-stack-list', overview.ubuntu],
    ['#aws-stack-list', overview.aws],
  ].forEach(([selector, rows]) => {
    rewriter
      .on(`${selector} .stack-row:not(.stack-row-header)`, { element: (element) => element.remove() })
      .on(selector, {
        element: (element) => {
          // Tells the browser script that the lists are already in place.
          element.setAttribute('data-ssr', 'true');
          element.append(rows, { html: true });
        },
      });
  });

  const response = new Response(rewriter.transform(templateResponse).body, templateResponse);
  response.headers.delete('Content-Length');
  response.headers.set('Cache-Control', `public, max-age=${PAGE_MAX_AGE_SECONDS}`);
  return response;
};

export default {
  async fetch(request) {
    const urlObject = new URL(request.url);

    if (urlObject.pathname.match(/^\/stacks-proxy$/)) {
      return setCorsHeaders(new Response('OK'));
    }

    urlObject.hostname = ORIGIN_HOST;

    const rssMatch = urlObject.pathname.match(/^\/stacks\/(.*index\.xml)/);
    if (rssMatch) {
      const response = await fetch(`https://bitrise-io.github.io/stacks/${rssMatch[1]}`);
      const data = (await response.text())
        .replaceAll('bitrise-io.github.io/stacks/', 'bitrise.io/stacks/')
        .replaceAll('stacks.bitrise.io/', 'bitrise.io/stacks/');
      return new Response(data, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });
    }

    // This puts access to the tool version catalog behind a consistent set of URLs
    // Additional background: https://bitrise.atlassian.net/browse/BE-2056
    const toolsMatch = urlObject.pathname.match(/^\/stacks\/tools\/v1\/(.*\.json)/);
    if (toolsMatch) {
      const sourceURL = new URL(`https://storage.googleapis.com/bitrise-cli-tool-catalog/${toolsMatch[1]}`);
      const response = await fetch(sourceURL);
      const data = response.status === 200 ? await response.text() : '';
      return setCorsHeaders(
        new Response(data, {
          status: response.status,
          statusText: response.statusText,
        }),
      );
    }

    if (urlObject.pathname.match(/^\/stacks\/.+/)) {
      const originalPath = urlObject.pathname;
      const pagePath = originalPath.replace(/^\/stacks\//, '').replace(/\/$/, '');
      const pageType = detailPageType(pagePath);
      urlObject.pathname = '/stacks/subpage';

      const [response, pageData, indexJson] = await Promise.all([
        fetch(urlObject),
        pageType ? fetchStacksJson(`${pagePath}/index.json`) : null,
        pageType && needsRemovalDate(pageType) ? fetchStacksJson('index.json') : null,
      ]);

      if (pageType) {
        // A detail page whose data cannot be fetched (unknown page, GitHub Pages down) is a 404.
        const isHtml = (response.headers.get('Content-Type') || '').includes('text/html');
        if (!pageData || !response.ok || !isHtml) return notFoundResponse();
        return renderDetailPage(response, buildPage(pagePath, pageData, indexJson));
      }

      const data = (await response.text()).replace(
        'https://bitrise.io/stacks/subpage',
        `https://bitrise.io${originalPath}`,
      );
      return new Response(data, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });
    }

    if (urlObject.pathname.match(/\/stacks$|stacks\/(.*)/)) {
      urlObject.pathname = '/stacks';
      const [response, indexJson] = await Promise.all([fetch(urlObject), fetchStacksJson('index.json')]);
      const isHtml = (response.headers.get('Content-Type') || '').includes('text/html');
      if (response.ok && isHtml && indexJson) return renderOverviewPage(response, indexJson);
      return response;
    }

    return await fetch(urlObject);
  },
};
