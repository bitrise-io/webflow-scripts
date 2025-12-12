export default {
  async fetch(request) {
    const urlObject = new URL(request.url);

    let useCors = false;
    let transformBody = null;
    urlObject.hostname = 'webflow.bitrise.io';

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
      // Set CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      // Append to/Add Vary header so browser will cache response correctly
      response.headers.append('Vary', 'Origin');
    }

    return response;
  },
};
