/* eslint-disable no-console -- the console output of a Worker is its log (Workers Logs / wrangler tail) */
import { fetchWithTimeout } from './fetchWithTimeout';

export const DISCOURSE_HOST = 'discuss.bitrise.io';

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
const CACHED_AT_HEADER = 'X-Cached-At';

// Discourse rate limiting. The page is rendered by the worker and waits for the topic JSON, so stalling a request
// for a few seconds is better than failing it (a crawler gives up long before a minute).
// - A 429 is retried after the wait Discourse asks for, within RATE_LIMIT_BUDGET_MS and MAX_ATTEMPTS.
// - A cooldown marker in KV tells other data centres (and later requests) to hold off until the limit is over.
//   KV is eventually consistent and has no atomic operations, so this is a soft lock that cuts the pile-up, not a
//   strict mutex.
// - Concurrent requests for the same URL in one isolate share a single Discourse call.
// Requests that can be answered from an expired KV copy never wait: they get the copy straight away.
const RATE_LIMIT_BUDGET_MS = 8 * 1000;
const MAX_ATTEMPTS = 3;
const DEFAULT_WAIT_SECONDS = 10;
const COOLDOWN_KEY = 'discourse:cooldown';

const fetchFromDiscourse = (urlObject, env) => {
  if (env && env.DISCOURSE_API_KEY && env.DISCOURSE_API_USERNAME) {
    // Authenticate with the Discourse API so requests are not throttled as anonymous traffic.
    // Both the key and the username are required; there is deliberately no default (admin) username.
    const headers = new Headers({
      Accept: 'application/json',
      'Api-Key': env.DISCOURSE_API_KEY,
      'Api-Username': env.DISCOURSE_API_USERNAME,
    });
    return fetchWithTimeout(urlObject, { headers });
  }
  return fetchWithTimeout(urlObject);
};

const jsonResponse = (body) => new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
// Spread retries out so requests that were rate limited together do not all return at the same moment.
const jitter = () => Math.floor(Math.random() * 1000);

// A plain-object copy of the upstream response, so one Discourse call can be shared between several requests.
const readUpstream = async (response) => ({
  status: response.status,
  ok: response.ok,
  body: await response.text(),
  contentType: response.headers.get('Content-Type') || 'application/json; charset=utf-8',
  retryAfter: response.headers.get('Retry-After'),
});

const toResponse = (upstream) =>
  new Response(upstream.body, { status: upstream.status, headers: { 'Content-Type': upstream.contentType } });

const rateLimitedUpstream = () => ({
  status: 429,
  ok: false,
  body: 'Rate limited',
  contentType: 'text/plain; charset=utf-8',
  retryAfter: null,
});

// Discourse sends the wait in the Retry-After header or as extras.wait_seconds in the JSON body.
const waitSecondsFrom = (upstream) => {
  let seconds = Number(upstream.retryAfter);
  if (!seconds) {
    try {
      seconds = JSON.parse(upstream.body).extras.wait_seconds;
    } catch (error) {
      // not a Discourse rate limit body; use the default
    }
  }
  return Number(seconds) || DEFAULT_WAIT_SECONDS;
};

const readCooldownMs = async (kv) => {
  try {
    const until = Number(await kv.get(COOLDOWN_KEY));
    return until > Date.now() ? until - Date.now() : 0;
  } catch (error) {
    console.log('kv cooldown read failed', String(error));
    return 0;
  }
};

// KV allows about one write per second to a key, so do not rewrite a cooldown this isolate already published.
let cooldownPublishedUntil = 0;
const writeCooldown = (kv, ctx, untilMs) => {
  if (!kv || untilMs <= cooldownPublishedUntil) return;
  cooldownPublishedUntil = untilMs;
  ctx.waitUntil(
    kv
      .put(COOLDOWN_KEY, String(untilMs), { expirationTtl: Math.max(60, Math.ceil((untilMs - Date.now()) / 1000)) })
      .catch((error) => console.log('kv cooldown write failed', String(error))),
  );
};

// Calls Discourse, honouring the shared cooldown and retrying rate limited responses while the time budget allows.
const fetchThrottled = async (urlObject, env, ctx, startedAt, budgetMs, attempt = 0, cooldownChecked = false) => {
  const kv = env.CHANGELOG;
  if (!cooldownChecked && kv) {
    const cooldownMs = await readCooldownMs(kv);
    if (cooldownMs > 0) {
      if (Date.now() - startedAt + cooldownMs > budgetMs) return rateLimitedUpstream();
      await sleep(cooldownMs + jitter());
    }
  }

  const upstream = await readUpstream(await fetchFromDiscourse(urlObject, env));
  if (upstream.status !== 429) return upstream;

  const waitMs = waitSecondsFrom(upstream) * 1000;
  writeCooldown(kv, ctx, Date.now() + waitMs);
  if (attempt + 1 >= MAX_ATTEMPTS || Date.now() - startedAt + waitMs > budgetMs) return upstream;

  await sleep(waitMs + jitter());
  return fetchThrottled(urlObject, env, ctx, startedAt, budgetMs, attempt + 1, true);
};

// Concurrent requests for the same key in this isolate share one Discourse call.
const inflight = new Map();
const fetchShared = (key, urlObject, env, ctx, budgetMs) => {
  const sharedKey = `${key}|${budgetMs > 0}`;
  if (!inflight.has(sharedKey)) {
    const call = fetchThrottled(urlObject, env, ctx, Date.now(), budgetMs).finally(() => inflight.delete(sharedKey));
    inflight.set(sharedKey, call);
  }
  return inflight.get(sharedKey);
};

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

  // With an expired copy to fall back on there is no reason to make the visitor wait out a rate limit.
  const budgetMs = hasStored ? 0 : RATE_LIMIT_BUDGET_MS;
  let fresh;
  try {
    fresh = await fetchShared(kvKey, urlObject, env, ctx, budgetMs);
  } catch (error) {
    console.log('discourse fetch failed', String(error));
  }

  if (fresh && fresh.ok) {
    ctx.waitUntil(
      kv
        .put(kvKey, fresh.body, { metadata: { storedAt: Date.now() }, expirationTtl: KV_RETENTION_SECONDS })
        .catch((error) => console.log('kv write failed', String(error))),
    );
    return { response: jsonResponse(fresh.body), cacheStatus: 'KV-MISS' };
  }

  if (hasStored) {
    return { response: jsonResponse(stored.value), cacheStatus: 'KV-STALE' };
  }
  if (fresh) {
    return { response: toResponse(fresh), cacheStatus: 'BYPASS' };
  }
  return { response: new Response('Upstream unavailable', { status: 502 }), cacheStatus: 'BYPASS' };
};

// Edge layer in front of KV. Returns { response, cacheStatus } where cacheStatus is EDGE-HIT or EDGE-STALE,
// or whatever the KV layer reported (KV-HIT, KV-MISS, KV-STALE, BYPASS).
export const fetchDiscourseCached = async (urlObject, env, ctx) => {
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

/**
 * Loads a topic from Discourse through the edge and KV caches.
 * @param {string} topicPath - "slug/id" (or just "id")
 * @param {object} env
 * @param {{ waitUntil: (promise: Promise<unknown>) => void }} ctx
 * @returns {Promise<{ topic: object | null, cacheStatus: string }>} topic is null when it cannot be loaded
 */
export const fetchDiscourseTopic = async (topicPath, env, ctx) => {
  const urlObject = new URL(`https://${DISCOURSE_HOST}/t/${topicPath}.json`);
  const { response, cacheStatus } = await fetchDiscourseCached(urlObject, env, ctx);
  if (!response.ok) return { topic: null, cacheStatus };
  try {
    const topic = await response.json();
    return { topic: topic.errors && topic.errors.length ? null : topic, cacheStatus };
  } catch (error) {
    return { topic: null, cacheStatus };
  }
};

// The changelog category on Discourse; the build job (build.js) lists its topics, subcategories included.
export const CHANGELOG_CATEGORY_ID = 6;

/**
 * Whether a Discourse topic is a changelog post: in the changelog category itself, or listed in the changelog the
 * build job generated, which also holds the topics of the subcategories (Steps, Stacks, Website, ...).
 * That list is used instead of asking Discourse for the subcategories: the worker's API key cannot list
 * categories, and anonymous requests from Cloudflare are rate limited.
 * @param {{ id: number, category_id: number }} topic
 * @param {{ topic_list: { topics: { id: number }[] } } | null} changelog - changelog.json, null when unavailable
 * @returns {boolean}
 */
export const isChangelogTopic = (topic, changelog) =>
  topic.category_id === CHANGELOG_CATEGORY_ID ||
  Boolean(changelog && changelog.topic_list.topics.some((entry) => entry.id === topic.id));
