const ORIGIN_HOST = 'bitrise.io';
const PRERENDERED_HOST = 'webflow-scripts.bitrise.io';

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
    pattern: /^\/integrations\/steps\/?$/,
    redirectTo: '/integrations',
  },
];

const setCorsHeaders = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.append('Vary', 'Origin');
  return response;
};

const fetchPrerenderedHtml = async (url, ctx) => {
  const urlObject = new URL(url);
  if (PRERENDERED_HOST.split(':').length === 2) {
    [urlObject.hostname, urlObject.port] = PRERENDERED_HOST.split(':');
  } else {
    urlObject.hostname = PRERENDERED_HOST;
  }

  const prerenderedUrl = routingPatterns
    .map((route) => {
      const match = urlObject.pathname.match(route.pattern);
      if (match && route.prerenderPattern) {
        urlObject.pathname = route.prerenderPattern.replace('$1', match[1]);
        return urlObject;
      }
      return null;
    })
    .filter(Boolean)
    .pop();

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

export default {
  async fetch(request, env, ctx) {
    const urlObject = new URL(request.url);
    const canonical = new URL(request.url);

    if (urlObject.pathname === '/integrations-proxy') {
      return setCorsHeaders(new Response('OK'));
    }

    const prerenderedResponse = await fetchPrerenderedHtml(urlObject, ctx);
    if (prerenderedResponse && prerenderedResponse.ok) {
      return prerenderedResponse;
    }

    urlObject.hostname = ORIGIN_HOST;
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
