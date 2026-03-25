const ORIGIN_HOST = 'bitrise.io';

const setCorsHeaders = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.append('Vary', 'Origin');
  return response;
};

export default {
  async fetch(request) {
    const urlObject = new URL(request.url);

    if (urlObject.pathname.match(/^\/changelog-proxy$/)) {
      return setCorsHeaders(new Response('OK'));
    }

    let useCors = false;
    let transformBody = null;
    urlObject.hostname = ORIGIN_HOST;

    if (urlObject.pathname.match(/^\/changelog\/api\/(.+\.json)$/)) {
      urlObject.hostname = 'discuss.bitrise.io';
      urlObject.pathname = urlObject.pathname.replace(/^\/changelog\/api\/(.+\.json)$/, '/$1');
      useCors = true;
    } else if (urlObject.pathname.match(/^\/changelog\.json$/)) {
      urlObject.hostname = 'web-cdn.bitrise.io';
      urlObject.pathname = 'changelog.json';
      useCors = true;
    } else if (urlObject.pathname.match(/^\/changelog_latest\.json$/)) {
      urlObject.hostname = 'web-cdn.bitrise.io';
      urlObject.pathname = 'changelog_latest.json';
      useCors = true;
    } else if (urlObject.pathname.match(/^\/changelog\.xml$/)) {
      urlObject.hostname = 'web-cdn.bitrise.io';
      urlObject.pathname = 'changelog.xml';
    } else if (urlObject.pathname.match(/^\/changelog\/.+/)) {
      const originalPath = urlObject.pathname;
      urlObject.pathname = '/changelog/topic';
      transformBody = (data) => data.replace('https://bitrise.io/changelog/topic', `https://bitrise.io${originalPath}`);
    }

    if (!useCors && !transformBody) {
      return fetch(urlObject);
    }

    let response = await fetch(urlObject);
    if (transformBody) {
      response = new Response(transformBody(await response.text()), response);
    } else {
      response = new Response(response.body, response);
    }

    if (useCors) {
      response = setCorsHeaders(response);
    }

    return response;
  },
};
