const ORIGIN_HOST = 'bitrise.io';
const PRERENDERED_BASE_URL = 'https://storage.googleapis.com/web-cdn.bitrise.io/webflow-ssr';

// Compact steplib data for the client-side list filters, published by the SSR job next to the pre-rendered pages.
const DATA_PATH = '/integrations/data.json';
const DATA_SOURCE_URL = `${PRERENDERED_BASE_URL}/integrations-data.json`;
const DATA_MAX_AGE_SECONDS = 300;

const routingPatterns = [
  {
    pattern: /^\/integrations\/steps\/(.+)/,
    prerenderPattern: '/integrations/$1.html',
    templatePath: '/integrations/step',
  },
  {
    pattern: /^\/integrations\/?$/,
    prerenderPattern: '/integrations.html',
    templatePath: '/integrations',
  },
  {
    pattern: /^\/integrations\/partners\/?$/,
    redirectTo: '/integrations',
  },
  {
    pattern: /^\/integrations\/steps\/?$/,
    redirectTo: '/integrations',
  },
];

const setCorsHeaders = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.append('Vary', 'Origin');
  return response;
};

// The keys of the steps in the current steplib, read from the compact data file the SSR job publishes with the pages.
// The deploy only adds files to the bucket, so pages of steps that left the steplib stay there; they are not served.
let currentStepKeys = { loadedAt: 0, keys: null };

const loadCurrentStepKeys = async () => {
  if (currentStepKeys.keys && Date.now() - currentStepKeys.loadedAt < DATA_MAX_AGE_SECONDS * 1000) {
    return currentStepKeys.keys;
  }
  try {
    const response = await fetch(DATA_SOURCE_URL, { cf: { cacheTtl: DATA_MAX_AGE_SECONDS, cacheEverything: true } });
    if (response.ok) {
      const data = await response.json();
      currentStepKeys = { loadedAt: Date.now(), keys: new Set(Object.keys(data.steps)) };
    }
  } catch (error) {
    // keep the previous copy
  }
  // null when the data has never been loaded: pages are then served without the check.
  return currentStepKeys.keys;
};

const fetchPrerenderedHtml = async (url, ctx) => {
  const { pathname } = new URL(url);

  const stepMatch = pathname.match(/^\/integrations\/steps\/(.+)/);
  if (stepMatch) {
    const stepKeys = await loadCurrentStepKeys();
    // Not a current step: no pre-rendered page, the request takes the template route like any unknown step.
    if (stepKeys && !stepKeys.has(stepMatch[1])) return null;
  }

  const prerenderedPath = routingPatterns
    .map((route) => {
      const match = pathname.match(route.pattern);
      if (match && route.prerenderPattern) {
        return route.prerenderPattern.replace('$1', match[1]);
      }
      return null;
    })
    .filter(Boolean)
    .pop();

  const prerenderedUrl = prerenderedPath ? new URL(`${PRERENDERED_BASE_URL}${prerenderedPath}`) : null;

  if (prerenderedUrl) {
    const cacheKey = prerenderedUrl.href;
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(prerenderedUrl);
      if (response.ok) {
        const responseClone = response.clone();
        ctx.waitUntil(
          cache.put(
            cacheKey,
            new Response(responseClone.body, {
              headers: {
                ...Object.fromEntries(response.headers.entries()),
                'Cache-Control': 'public, max-age=300',
              },
            }),
          ),
        );
        return response;
      }
    } catch (error) {
      // Ignore errors and fallback to origin fetch
    }
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

  const upstream = await fetch(DATA_SOURCE_URL);
  if (!upstream.ok) {
    // The client falls back to the full steplib spec on any non-OK answer.
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

export default {
  async fetch(request, env, ctx) {
    const urlObject = new URL(request.url);
    const canonical = new URL(request.url);

    if (urlObject.pathname === '/integrations-proxy') {
      return setCorsHeaders(new Response('OK'));
    }

    if (urlObject.pathname === DATA_PATH) {
      return serveData(ctx);
    }

    const isTemplateRequest = urlObject.searchParams.has('template');

    if (!isTemplateRequest) {
      const prerenderedResponse = await fetchPrerenderedHtml(urlObject, ctx);
      if (prerenderedResponse && prerenderedResponse.ok) {
        return prerenderedResponse;
      }
    }

    urlObject.hostname = ORIGIN_HOST;
    urlObject.searchParams.delete('template');
    canonical.hostname = 'bitrise.io';

    const routingMatch = routingPatterns
      .map((route) => {
        if (urlObject.pathname.match(route.pattern)) return route;
        return null;
      })
      .filter(Boolean)
      .pop();
    if (routingMatch) {
      if (routingMatch.redirectTo) {
        urlObject.pathname = routingMatch.redirectTo;
        return Response.redirect(urlObject, 301);
      }
      urlObject.pathname = routingMatch.templatePath;
    }

    canonical.pathname = canonical.pathname.replace(/\/$/, '');

    const response = await fetch(urlObject);
    const data = await response.text();
    return new Response(
      data.replace(
        'href="https://bitrise.io/integrations/step" rel="canonical"',
        `href="${canonical.href}" rel="canonical"`,
      ),
      {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      },
    );
  },
};
