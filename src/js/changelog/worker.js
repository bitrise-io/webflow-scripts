const ORIGIN_HOST = 'bitrise.io';
const DISCOURSE_HOST = 'discuss.bitrise.io';
const SNAPSHOT_BASE_URL = 'https://web-cdn.bitrise.io/changelog_topics';

// Discourse responses are served from the edge cache so the origin is hit as rarely as possible:
// - younger than FRESH_TTL: served from cache, Discourse is not contacted
// - older than FRESH_TTL, younger than STALE_TTL: served from cache immediately, refreshed in the background
// - Discourse failing or rate limiting (429/5xx): the last good copy is kept and keeps being served
const FRESH_TTL_SECONDS = 5 * 60;
const STALE_TTL_SECONDS = 7 * 24 * 60 * 60;
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

const topicIdFromApiPath = (pathname) => {
  const match = pathname.match(/^\/changelog\/api\/t\/(?:[^/]+\/)?(\d+)\.json$/);
  return match ? match[1] : null;
};

// Snapshots are written by the changelog generator, so serving them needs no request to Discourse.
const fetchTopicSnapshot = async (topicId) => {
  try {
    const snapshot = await fetch(`${SNAPSHOT_BASE_URL}/${topicId}.json`);
    if (!snapshot.ok) return null;
    const response = new Response(snapshot.body, snapshot);
    response.headers.set('Content-Type', 'application/json');
    response.headers.set('Cache-Control', `public, max-age=${CLIENT_MAX_AGE_SECONDS}`);
    response.headers.set('X-Proxy-Cache', 'SNAPSHOT');
    return response;
  } catch (error) {
    console.log('snapshot fetch failed', String(error));
    return null;
  }
};

// Returns { response, cacheStatus } where cacheStatus is HIT, STALE, MISS or BYPASS.
const fetchDiscourseCached = async (urlObject, env, ctx) => {
  const cache = caches.default;
  // Key on the public URL only, never on credentials.
  const cacheKey = new Request(urlObject.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);

  const refresh = async () => {
    const fresh = await fetchFromDiscourse(urlObject, env);
    if (fresh.ok) {
      const toStore = new Response(fresh.clone().body, fresh);
      toStore.headers.delete('Set-Cookie');
      toStore.headers.set(CACHED_AT_HEADER, String(Date.now()));
      // Cache API expiry is driven by Cache-Control; keep entries for the whole stale window.
      toStore.headers.set('Cache-Control', `public, max-age=${STALE_TTL_SECONDS}`);
      await cache.put(cacheKey, toStore);
    }
    return fresh;
  };

  if (cached) {
    const ageSeconds = (Date.now() - Number(cached.headers.get(CACHED_AT_HEADER) || 0)) / 1000;
    if (ageSeconds < FRESH_TTL_SECONDS) {
      return { response: cached, cacheStatus: 'HIT' };
    }
    // Stale: answer right away, refresh in the background. A failed refresh leaves the old copy in place.
    ctx.waitUntil(refresh().catch((error) => console.log('background refresh failed', String(error))));
    return { response: cached, cacheStatus: 'STALE' };
  }

  try {
    const fresh = await refresh();
    return { response: fresh, cacheStatus: fresh.ok ? 'MISS' : 'BYPASS' };
  } catch (error) {
    console.log('discourse fetch failed', String(error));
    return { response: new Response('Upstream unavailable', { status: 502 }), cacheStatus: 'BYPASS' };
  }
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
      const topicId = topicIdFromApiPath(urlObject.pathname);
      const snapshot = topicId && (await fetchTopicSnapshot(topicId));
      if (snapshot) {
        return setCorsHeaders(snapshot);
      }
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
