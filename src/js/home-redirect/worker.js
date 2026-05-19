const REDIRECT_COOKIE = 'webflow_user_redirect';
const APP_URL = 'https://app.bitrise.io';
const HOME_URL = 'https://bitrise.io/';

export default {
  async fetch(request, env, ctx) {
    ctx.passThroughOnException();
    const url = new URL(request.url);
    const cookies = request.headers.get('Cookie') || '';
    const isLoggedIn = parseCookieValue(cookies, REDIRECT_COOKIE) === '1';

    let redirectTo = null;
    if (url.pathname === '/') {
      redirectTo = isLoggedIn ? APP_URL : null;
    } else if (url.pathname === '/home') {
      redirectTo = isLoggedIn ? null : HOME_URL;
    }

    if (env.DRY_RUN) {
      console.log(`[home-redirect dry-run] path=${url.pathname} action=${redirectTo ? 'redirect → ' + redirectTo : 'passthrough'}`);
      return fetch(request);
    }

    if (redirectTo) {
      return Response.redirect(redirectTo, 302);
    }
    return fetch(request);
  },
};

function parseCookieValue(cookieHeader, name) {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}
