const REDIRECT_COOKIE = 'webflow_user_redirect';
const APP_URL = 'https://app.bitrise.io';
const HOME_URL = 'https://bitrise.io/';

export default {
  async fetch(request, env, ctx) {
    ctx.passThroughOnException();
    const url = new URL(request.url);
    const cookies = request.headers.get('Cookie') || '';
    const isLoggedIn = parseCookieValue(cookies, REDIRECT_COOKIE) === '1';

    const { pathname } = url;

    if (env.DRY_RUN) {
      let action;
      if (pathname === '/') action = isLoggedIn ? `redirect → ${APP_URL}` : 'passthrough';
      else if (pathname === '/home') action = isLoggedIn ? `fetch ${HOME_URL} from origin` : `redirect → ${HOME_URL}`;
      console.log(`[home-redirect dry-run] path=${pathname} action=${action}`);
      return fetch(request);
    }

    if (pathname === '/') {
      return isLoggedIn ? Response.redirect(APP_URL, 302) : fetch(request);
    }

    if (pathname === '/home') {
      if (!isLoggedIn) return Response.redirect(HOME_URL, 302);
      // Origin has a 301 /home → / which would loop back through this worker.
      // Fetch / directly from origin so the subrequest bypasses worker routing.
      return fetch(new Request(HOME_URL, request));
    }

    return fetch(request);
  },
};

function parseCookieValue(cookieHeader, name) {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}
