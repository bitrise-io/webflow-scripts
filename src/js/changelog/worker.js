const ORIGIN_HOST = 'bitrise.io';
const DISCOURSE_HOST = 'discuss.bitrise.io';

// Discourse JSON is cached in two layers so the origin is hit as rarely as possible.
//
// 1. Edge cache (Cache API, per data centre, in front):
//    - younger than EDGE_FRESH_TTL: served straight from the edge cache
//    - older, but younger than EDGE_STALE_TTL: served immediately and refreshed in the background
//    - nothing cached: falls through to layer 2
// 2. KV (CHANGELOG namespace, global and durable, behind):
//    - stored less than KV_FRESH_TTL ago: served from KV, Discourse is not contacted
//    - older: fetched from Discourse again and KV is updated on success
//    - Discourse failing or rate limiting: the expired KV copy is served anyway
//    KV entries are not expired after KV_FRESH_TTL (that would delete the fallback); they only expire
//    after KV_RETENTION so abandoned topics eventually get cleaned up.
const EDGE_FRESH_TTL_SECONDS = 60 * 60;
const EDGE_STALE_TTL_SECONDS = 7 * 24 * 60 * 60;
const KV_FRESH_TTL_SECONDS = 24 * 60 * 60;
const KV_RETENTION_SECONDS = 90 * 24 * 60 * 60;
const CLIENT_MAX_AGE_SECONDS = 60;
const CACHED_AT_HEADER = 'X-Cached-At';

const setCorsHeaders = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.append('Vary', 'Origin');
  return response;
};

const fetchFromDiscourse = (urlObject, env) => {
  if (env && env.DISCOURSE_API_KEY) {
    // Authenticate with the Discourse API so requests are not throttled as anonymous traffic.
    const headers = new Headers({
      Accept: 'application/json',
      'Api-Key': env.DISCOURSE_API_KEY,
      'Api-Username': env.DISCOURSE_API_USERNAME || 'system',
    });
    return fetch(urlObject, { headers });
  }
  return fetch(urlObject);
};

const jsonResponse = (body) => new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });

// A 404 (deleted topic) is passed through; rate limiting, blocking and server errors fall back to KV.
const isUpstreamFailure = (response) => response.status === 403 || response.status === 429 || response.status >= 500;

// KV layer. Returns { response, cacheStatus } where cacheStatus is KV-HIT, KV-MISS, KV-STALE or BYPASS.
const loadFromKvOrDiscourse = async (urlObject, env, ctx) => {
  const kv = env && env.CHANGELOG;
  if (!kv) {
    return { response: await fetchFromDiscourse(urlObject, env), cacheStatus: 'BYPASS' };
  }

  // Key on the public path only, never on credentials.
  const kvKey = `discourse:${urlObject.pathname}${urlObject.search}`;
  let stored = null;
  try {
    stored = await kv.getWithMetadata(kvKey);
  } catch (error) {
    console.log('kv read failed', String(error));
  }

  const hasStored = stored && stored.value !== null;
  if (hasStored) {
    const ageSeconds = (Date.now() - Number((stored.metadata && stored.metadata.storedAt) || 0)) / 1000;
    if (ageSeconds < KV_FRESH_TTL_SECONDS) {
      return { response: jsonResponse(stored.value), cacheStatus: 'KV-HIT' };
    }
  }

  let fresh;
  try {
    fresh = await fetchFromDiscourse(urlObject, env);
  } catch (error) {
    console.log('discourse fetch failed', String(error));
  }

  if (fresh && fresh.ok) {
    const body = await fresh.text();
    ctx.waitUntil(
      kv
        .put(kvKey, body, { metadata: { storedAt: Date.now() }, expirationTtl: KV_RETENTION_SECONDS })
        .catch((error) => console.log('kv write failed', String(error))),
    );
    return { response: jsonResponse(body), cacheStatus: 'KV-MISS' };
  }

  if (hasStored) {
    return { response: jsonResponse(stored.value), cacheStatus: 'KV-STALE' };
  }
  if (fresh && !isUpstreamFailure(fresh)) {
    return { response: fresh, cacheStatus: 'BYPASS' };
  }
  return { response: fresh || new Response('Upstream unavailable', { status: 502 }), cacheStatus: 'BYPASS' };
};

// Edge layer in front of KV. Returns { response, cacheStatus } where cacheStatus is EDGE-HIT or EDGE-STALE,
// or whatever the KV layer reported (KV-HIT, KV-MISS, KV-STALE, BYPASS).
const fetchDiscourseCached = async (urlObject, env, ctx) => {
  const cache = caches.default;
  // Key on the public URL only, never on credentials. Unchanged from the original cache so entries stay warm.
  const cacheKey = new Request(urlObject.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);

  // Loads through KV/Discourse and, for good responses, (re)populates the edge cache.
  // A KV-STALE result is stored too, so during a Discourse outage each data centre retries at most once per
  // EDGE_FRESH_TTL instead of on every request.
  const refresh = async () => {
    const result = await loadFromKvOrDiscourse(urlObject, env, ctx);
    if (result.response.ok && result.cacheStatus !== 'BYPASS') {
      const toStore = new Response(result.response.clone().body, result.response);
      toStore.headers.delete('Set-Cookie');
      toStore.headers.set(CACHED_AT_HEADER, String(Date.now()));
      // Cache API expiry is driven by Cache-Control; keep entries for the whole stale window.
      toStore.headers.set('Cache-Control', `public, max-age=${EDGE_STALE_TTL_SECONDS}`);
      await cache.put(cacheKey, toStore);
    }
    return result;
  };

  if (cached) {
    const ageSeconds = (Date.now() - Number(cached.headers.get(CACHED_AT_HEADER) || 0)) / 1000;
    if (ageSeconds < EDGE_FRESH_TTL_SECONDS) {
      return { response: cached, cacheStatus: 'EDGE-HIT' };
    }
    // Stale: answer right away, refresh in the background. A failed refresh leaves the old copy in place.
    ctx.waitUntil(refresh().catch((error) => console.log('background refresh failed', String(error))));
    return { response: cached, cacheStatus: 'EDGE-STALE' };
  }

  return refresh();
};

export default {
  async fetch(request, env, ctx) {
    const urlObject = new URL(request.url);

    if (urlObject.pathname.match(/^\/changelog-proxy$/)) {
      return setCorsHeaders(new Response('OK'));
    }

    let useCors = false;
    let transformBody = null;
    urlObject.hostname = ORIGIN_HOST;

    if (urlObject.pathname.match(/^\/changelog\/api\/(.+\.json)$/)) {
      urlObject.hostname = DISCOURSE_HOST;
      urlObject.pathname = urlObject.pathname.replace(/^\/changelog\/api\/(.+\.json)$/, '/$1');
      useCors = true;
    } else if (urlObject.pathname.match(/^\/changelog\.json$/)) {
      urlObject.hostname = 'web-cdn.bitrise.io';
      urlObject.pathname = 'changelog.json';
      useCors = true;
    } else if (urlObject.pathname.match(/^\/changelog_latest\.json$/)) {
      urlObject.hostname = 'web-cdn.bitrise.io';
      urlObject.pathname = 'changelog_latest.json';
      useCors = true;
    } else if (urlObject.pathname.match(/^\/changelog\.xml$/)) {
      urlObject.hostname = 'web-cdn.bitrise.io';
      urlObject.pathname = 'changelog.xml';
    } else if (urlObject.pathname.match(/^\/changelog\/.+/)) {
      const originalPath = urlObject.pathname;
      urlObject.pathname = '/changelog/topic';
      transformBody = (data) => data.replace('https://bitrise.io/changelog/topic', `https://bitrise.io${originalPath}`);
    }

    if (!useCors && !transformBody) {
      return fetch(urlObject);
    }

    const isDiscourse = urlObject.hostname === DISCOURSE_HOST;
    let response;
    let cacheStatus = 'NONE';
    if (isDiscourse) {
      ({ response, cacheStatus } = await fetchDiscourseCached(urlObject, env, ctx));
    } else {
      response = await fetch(urlObject);
    }

    if (transformBody) {
      response = new Response(transformBody(await response.text()), response);
    } else {
      response = new Response(response.body, response);
    }

    if (isDiscourse) {
      response.headers.set('X-Proxy-Cache', cacheStatus);
      if (response.ok) {
        // Let browsers and the edge reuse it briefly too; the worker handles longer-term staleness.
        response.headers.set('Cache-Control', `public, max-age=${CLIENT_MAX_AGE_SECONDS}`);
      } else {
        response.headers.set('Cache-Control', 'no-store');
      }
    }

    if (useCors) {
      response = setCorsHeaders(response);
    }

    return response;
  },
};
