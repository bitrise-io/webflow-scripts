const ORIGIN_HOST = 'bitrise.io';
const DISCOURSE_HOST = 'discuss.bitrise.io';

// Discourse JSON is stored in the CHANGELOG KV namespace so the origin is hit as rarely as possible:
// - stored less than FRESH_TTL ago: served from KV, Discourse is not contacted
// - older: fetched from Discourse again and KV is updated on success
// - Discourse failing or rate limiting: the expired copy in KV is served anyway
// KV entries are not expired after FRESH_TTL (that would delete the fallback); they only expire after
// KV_RETENTION so abandoned topics eventually get cleaned up.
const FRESH_TTL_SECONDS = 24 * 60 * 60;
const KV_RETENTION_SECONDS = 90 * 24 * 60 * 60;
const CLIENT_MAX_AGE_SECONDS = 60;

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

// Returns { response, cacheStatus } where cacheStatus is HIT, MISS, STALE or BYPASS.
const fetchDiscourseCached = async (urlObject, env, ctx) => {
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
    if (ageSeconds < FRESH_TTL_SECONDS) {
      return { response: jsonResponse(stored.value), cacheStatus: 'HIT' };
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
    return { response: jsonResponse(body), cacheStatus: 'MISS' };
  }

  if (hasStored) {
    return { response: jsonResponse(stored.value), cacheStatus: 'STALE' };
  }
  if (fresh && !isUpstreamFailure(fresh)) {
    return { response: fresh, cacheStatus: 'BYPASS' };
  }
  return { response: fresh || new Response('Upstream unavailable', { status: 502 }), cacheStatus: 'BYPASS' };
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
