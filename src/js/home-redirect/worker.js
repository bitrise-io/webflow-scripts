const REDIRECT_COOKIE = 'webflow_user_redirect';
const APP_URL = 'https://app.bitrise.io';

export default {
  async fetch(request) {
    const cookies = request.headers.get('Cookie') || '';
    if (parseCookieValue(cookies, REDIRECT_COOKIE) === '1') {
      return Response.redirect(APP_URL, 302);
    }
    return fetch(request);
  },
};

function parseCookieValue(cookieHeader, name) {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}
