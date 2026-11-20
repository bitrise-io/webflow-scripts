const REDIRECT_COOKIE = 'webflow_user_redirect';
const APP_URL = 'https://app.bitrise.io';
const BITRISE_ROOT = 'https://bitrise.io/';
const BITRISE_HOME = 'https://bitrise.io/home';

// Prevents browsers and CDNs from caching responses and bypassing worker logic
// on subsequent visits. Vary ensures cookie/referrer changes invalidate CDN entries.
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Vary': 'Cookie, Referer',
};

export default {
  async fetch(request, _env, ctx) {
    ctx.passThroughOnException();
    const { pathname } = new URL(request.url);
    const cookies = request.headers.get('Cookie') || '';
    const isLoggedIn = parseCookieValue(cookies, REDIRECT_COOKIE) === '1';

    if (pathname === '/') {
      if (!isLoggedIn) return withNoCacheHeaders(await fetch(request));
      return withNoCacheHeaders(Response.redirect(isBitriseReferrer(request) ? BITRISE_HOME : APP_URL, 302));
    }

    if (pathname === '/home') {
      if (!isLoggedIn) return withNoCacheHeaders(Response.redirect(BITRISE_ROOT, 302));
      // /home doesn't exist on origin; fetch / directly to serve the marketing homepage.
      // Strip cookies so the origin sees a non-logged-in request.
      const headers = new Headers(request.headers);
      headers.delete('Cookie');
      return withNoCacheHeaders(await fetch(BITRISE_ROOT, { headers }));
    }

    // Intended to be unreachable: wrangler.toml routes this worker only to / and /home
    return fetch(request);
  },
};

function withNoCacheHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(NO_CACHE_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function parseCookieValue(cookieHeader, name) {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

function isBitriseReferrer(request) {
  const referrer = request.headers.get('Referer') || '';
  try {
    return new URL(referrer).hostname.includes('bitrise');
  } catch {
    return false;
  }
}
