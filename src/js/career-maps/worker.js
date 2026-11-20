const ORIGIN_HOST = 'bitrise.io';
const PRERENDERED_BASE_URL = 'https://storage.googleapis.com/web-cdn.bitrise.io/webflow-ssr';
const PAGE_MAX_AGE_SECONDS = 300;

// The career maps data for the browser script, published by the SSR job next to the pre-rendered pages. Until the
// SSR job has run, the full file of the generator job is served.
const DATA_PATH = '/careers/maps/data.json';
const DATA_SOURCE_URL = `${PRERENDERED_BASE_URL}/career-maps-data.json`;
const LEGACY_DATA_SOURCE_URL = 'https://web-cdn.bitrise.io/career-maps.json';
const DATA_MAX_AGE_SECONDS = 300;

// The paths of the level pages, and where the team and job paths lead, published by the SSR job with the pages.
const PAGE_INDEX_URL = `${PRERENDERED_BASE_URL}/career-maps-pages.json`;

const routingPatterns = [
  {
    pattern: /^\/careers\/maps\/?$/,
    prerenderPattern: '/careers/maps.html',
    templatePath: '/careers/maps',
  },
  {
    // The path of the level page template; it used to be in the sitemap.
    pattern: /^\/careers\/maps\/team\/?$/,
    redirectTo: '/careers/maps',
  },
  {
    // Slugs only, so a path cannot point outside of the folder of the pages in the bucket.
    pattern: /^\/careers\/maps\/([a-z0-9-]+(?:\/[a-z0-9-]+)*)\/?$/,
    prerenderPattern: '/careers/maps/$1.html',
    templatePath: '/careers/maps/team',
    isLevelPage: true,
  },
];

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

// The deploy only adds files to the bucket, so pages of levels that are gone stay there; they are not served.
let pageIndex = { loadedAt: 0, index: null };

const loadPageIndex = async () => {
  if (pageIndex.index && Date.now() - pageIndex.loadedAt < PAGE_MAX_AGE_SECONDS * 1000) {
    return pageIndex.index;
  }
  try {
    const response = await fetch(PAGE_INDEX_URL, { cf: { cacheTtl: PAGE_MAX_AGE_SECONDS, cacheEverything: true } });
    if (response.ok) {
      const data = await response.json();
      pageIndex = { loadedAt: Date.now(), index: { pages: new Set(data.pages), redirects: data.redirects || {} } };
    }
  } catch (error) {
    // keep the previous copy
  }
  // null when the index has never been loaded: requests then take the template route, as before the SSR job.
  return pageIndex.index;
};

const fetchPrerenderedHtml = async (prerenderedPath, ctx) => {
  const prerenderedUrl = new URL(`${PRERENDERED_BASE_URL}${prerenderedPath}`);
  const cacheKey = prerenderedUrl.href;
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const upstream = await fetch(prerenderedUrl);
    const contentType = upstream.headers.get('Content-Type') || '';
    if (upstream.ok && contentType.includes('text/html')) {
      const response = new Response(upstream.body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': `public, max-age=${PAGE_MAX_AGE_SECONDS}`,
        },
      });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }
  } catch (error) {
    // Ignore errors and fallback to origin fetch
  }

  return null;
};

const serveData = async (ctx) => {
  const cache = caches.default;
  const cacheKey = DATA_SOURCE_URL;
  const cached = await cache.match(cacheKey);
  if (cached) {
    return setCorsHeaders(new Response(cached.body, cached));
  }

  let upstream = await fetch(DATA_SOURCE_URL);
  if (!upstream.ok) upstream = await fetch(LEGACY_DATA_SOURCE_URL);
  if (!upstream.ok) {
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }

  const response = new Response(upstream.body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${DATA_MAX_AGE_SECONDS}`,
    },
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return setCorsHeaders(response);
};

// The Webflow template of a page, with the canonical URL of the page that was asked for. The browser script renders
// the content.
const serveTemplate = async (urlObject, templatePath) => {
  const templateUrl = new URL(urlObject);
  templateUrl.hostname = ORIGIN_HOST;
  templateUrl.pathname = templatePath;
  templateUrl.searchParams.delete('template');

  const canonical = new URL(urlObject);
  canonical.hostname = ORIGIN_HOST;
  canonical.search = '';
  canonical.pathname = canonical.pathname.replace(/\/$/, '');

  const response = await fetch(templateUrl);
  const data = await response.text();
  return new Response(
    data.replace(
      `href="https://bitrise.io${templatePath}" rel="canonical"`,
      `href="${canonical.href}" rel="canonical"`,
    ),
    {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    },
  );
};

export default {
  async fetch(request, env, ctx) {
    const urlObject = new URL(request.url);

    if (urlObject.pathname === DATA_PATH) {
      return serveData(ctx);
    }

    const route = routingPatterns.find((r) => urlObject.pathname.match(r.pattern));

    // The SSR job reads the templates through here (?template=true); they are passed on as they are in Webflow.
    if (!route || urlObject.searchParams.has('template')) {
      urlObject.hostname = ORIGIN_HOST;
      urlObject.searchParams.delete('template');
      return fetch(urlObject);
    }

    if (route.redirectTo) {
      urlObject.pathname = route.redirectTo;
      return Response.redirect(urlObject.toString(), 301);
    }

    const match = urlObject.pathname.match(route.pattern);
    if (route.isLevelPage) {
      const index = await loadPageIndex();
      if (index && !index.pages.has(match[1])) {
        // A team or a job: its first level. Anything else is not a page.
        const target = index.redirects[match[1]];
        if (!target) return notFoundResponse();
        urlObject.pathname = `/careers/maps/${target}`;
        return Response.redirect(urlObject.toString(), 301);
      }
    }

    const prerenderedResponse = await fetchPrerenderedHtml(
      route.prerenderPattern.replace('$1', match && match[1]),
      ctx,
    );
    if (prerenderedResponse) {
      return prerenderedResponse;
    }

    return serveTemplate(urlObject, route.templatePath);
  },
};
