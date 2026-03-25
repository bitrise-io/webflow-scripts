const setCorsHeaders = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.append('Vary', 'Origin');
  return response;
};

export default {
  async fetch(request) {
    const urlObject = new URL(request.url);

    if (urlObject.pathname.match(/^\/resources\/tools\/app-navigator-proxy$/)) {
      return setCorsHeaders(new Response('OK'));
    }

    urlObject.hostname = 'app-benchmark.vercel.app';

    return fetch(urlObject);
  },
};
