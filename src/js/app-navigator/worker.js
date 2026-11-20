const setCorsHeaders = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.append('Vary', 'Origin');
  return response;
};

export default {
  async fetch(request) {
    const urlObject = new URL(request.url);

    // app.bitrise.io only serves as a fallback for when the bitrise.io route is down
    // (see 404.js). Whenever this worker runs there, the worker is up, so send visitors
    // to the canonical bitrise.io URL.
    if (urlObject.hostname === 'app.bitrise.io') {
      urlObject.hostname = 'bitrise.io';
      return Response.redirect(urlObject.toString(), 301);
    }

    if (urlObject.pathname.match(/^\/resources\/tools\/app-navigator-proxy$/)) {
      return setCorsHeaders(new Response('OK'));
    }

    urlObject.hostname = 'app-benchmark.vercel.app';

    return fetch(urlObject);
  },
};
