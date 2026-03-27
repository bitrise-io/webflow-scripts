const setCorsHeaders = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.append('Vary', 'Origin');
  return response;
};

export default {
  async fetch(request) {
    const urlObject = new URL(request.url);

    if (urlObject.hostname === 'app.bitrise.io') {
      try {
        const probeResponse = await fetch('https://bitrise.io/resources/tools/app-navigator-proxy');
        if (probeResponse.ok) {
          urlObject.hostname = 'bitrise.io';
          return Response.redirect(urlObject.toString(), 301);
        }
      } catch {
        // proxy unreachable, skip redirect to avoid loop
      }
    }

    if (urlObject.pathname.match(/^\/resources\/tools\/app-navigator-proxy$/)) {
      return setCorsHeaders(new Response('OK'));
    }

    urlObject.hostname = 'app-benchmark.vercel.app';

    return fetch(urlObject);
  },
};
