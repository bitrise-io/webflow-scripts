const REDIRECT_COOKIE = 'webflow_user_redirect';
const APP_URL = 'https://app.bitrise.io';
const BITRISE_ROOT = 'https://bitrise.io/';
const BITRISE_HOME = 'https://bitrise.io/home';

export default {
  async fetch(request, env, ctx) {
    ctx.passThroughOnException();
    const { pathname } = new URL(request.url);
    const cookies = request.headers.get('Cookie') || '';
    const isLoggedIn = parseCookieValue(cookies, REDIRECT_COOKIE) === '1';

    if (env.DRY_RUN) {
      let action;
      if (pathname === '/') {
        if (!isLoggedIn) action = 'passthrough';
        else action = isBitriseReferrer(request) ? `redirect → ${BITRISE_HOME}` : `redirect → ${APP_URL}`;
      } else if (pathname === '/home') {
        action = `fetch ${BITRISE_ROOT} from origin (no cookie)`;
      }
      console.log(`[home-redirect dry-run] path=${pathname} referrer=${request.headers.get('Referer') || 'none'} action=${action}`);
      return fetch(request);
    }

    if (pathname === '/') {
      if (!isLoggedIn) return fetch(request);
      return isBitriseReferrer(request)
        ? Response.redirect(BITRISE_HOME, 302)
        : Response.redirect(APP_URL, 302);
    }

    if (pathname === '/home') {
      // Origin has a 301 /home → / so fetch / directly to avoid a redirect loop.
      // Strip cookies so the origin sees an anonymous request.
      const headers = new Headers(request.headers);
      headers.delete('Cookie');
      return fetch(BITRISE_ROOT, { headers });
    }

    return fetch(request);
  },
};

function parseCookieValue(cookieHeader, name) {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

function isBitriseReferrer(request) {
  const referrer = request.headers.get('Referer') || '';
  try {
    return new URL(referrer).hostname === 'bitrise.io';
  } catch {
    return false;
  }
}
