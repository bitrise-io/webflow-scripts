/**
 * Answers every request it gets with a 503 maintenance page. The routes are managed in the Cloudflare dashboard (not
 * in wrangler.toml), so a deploy never starts or ends a maintenance window: the worker is attached to the paths that
 * are under maintenance for as long as the window lasts.
 *
 * Settings, in the worker's variables (kept across deploys, see keep_vars in wrangler.toml):
 * - MAINTENANCE_END (variable): when the maintenance ends, an ISO date such as 2026-12-01T16:00:00Z. Sent as the
 *   Retry-After header. Left out when it is not set, not a date, or already past.
 * - MAINTENANCE_BYPASS_SECRET (secret): /maintenance.bypass?<secret> sets a cookie that lets a browser through to the
 *   origin for a day. Without the secret nobody can bypass.
 */
const MAINTENANCE_PAGE_URL = 'https://webflow-scripts.bitrise.io/maintenance.html';
const MAINTENANCE_MESSAGE = 'Service under maintenance';
const FALLBACK_HTML =
  '<html><body><h1>Under maintenance</h1><p>A quick tune-up is in progress. Faster builds on the way.</p></body></html>';
const BYPASS_COOKIE = 'maintenance_bypass';

/**
 * The Retry-After header of the maintenance window: the end date as an HTTP date, if it is a date in the future.
 * @param {string | undefined} maintenanceEnd
 * @returns {Record<string, string>}
 */
const retryAfterHeader = (maintenanceEnd) => {
  const end = maintenanceEnd ? new Date(maintenanceEnd) : null;
  if (!end || Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) return {};
  return { 'Retry-After': end.toUTCString() };
};

/**
 * @param {string} cookieHeader
 * @param {string} name
 * @returns {string | null}
 */
const parseCookieValue = (cookieHeader, name) => {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const secret = env.MAINTENANCE_BYPASS_SECRET;
    const retryAfter = retryAfterHeader(env.MAINTENANCE_END);

    // /maintenance.bypass?<secret> -> set bypass cookie
    // /maintenance.bypass?off -> clear bypass cookie
    if (url.pathname === '/maintenance.bypass') {
      if (secret && url.searchParams.has(secret)) {
        return new Response('Bypass enabled', {
          headers: {
            'Set-Cookie': `${BYPASS_COOKIE}=${secret}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Lax`,
          },
        });
      }
      if (url.searchParams.has('off')) {
        return new Response('Bypass disabled', {
          headers: {
            'Set-Cookie': `${BYPASS_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
          },
        });
      }
    }

    // If bypass cookie is set, pass through to origin
    if (secret && parseCookieValue(request.headers.get('Cookie') || '', BYPASS_COOKIE) === secret) {
      return fetch(request);
    }

    const accept = request.headers.get('Accept') || '';

    // JSON response for API clients
    if (accept.includes('application/json')) {
      return new Response(JSON.stringify({ error: MAINTENANCE_MESSAGE }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...retryAfter },
      });
    }

    // Plain text response for CLI tools, curl, etc.
    if (!accept.includes('text/html')) {
      return new Response(MAINTENANCE_MESSAGE, {
        status: 503,
        headers: { 'Content-Type': 'text/plain', ...retryAfter },
      });
    }

    // HTML response for browsers
    const cache = caches.default;
    let maintenanceHTML;
    const cached = await cache.match(MAINTENANCE_PAGE_URL);

    if (cached) {
      maintenanceHTML = await cached.text();
    } else {
      try {
        const response = await fetch(MAINTENANCE_PAGE_URL);
        // An error page is not the maintenance page: it is neither shown nor cached.
        if (!response.ok) throw new Error(`Maintenance page answered ${response.status}`);
        maintenanceHTML = await response.text();

        ctx.waitUntil(
          cache.put(
            MAINTENANCE_PAGE_URL,
            new Response(maintenanceHTML, {
              headers: { 'Cache-Control': 'public, max-age=300' },
            }),
          ),
        );
      } catch (err) {
        maintenanceHTML = FALLBACK_HTML;
      }
    }

    return new Response(maintenanceHTML, {
      status: 503,
      headers: { 'Content-Type': 'text/html', ...retryAfter },
    });
  },
};
