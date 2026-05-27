const ORIGIN_HOST = 'bitrise.io';

const setCorsHeaders = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.append('Vary', 'Origin');
  return response;
};

export default {
  async fetch(request) {
    const urlObject = new URL(request.url);

    if (urlObject.pathname.match(/^\/stacks-proxy$/)) {
      return setCorsHeaders(new Response('OK'));
    }

    urlObject.hostname = ORIGIN_HOST;

    const rssMatch = urlObject.pathname.match(/^\/stacks\/(.*index\.xml)/);
    if (rssMatch) {
      urlObject.hostname = 'stacks.bitrise.io';
      urlObject.pathname = `/${rssMatch[1]}`;
      urlObject.search = '?proxy=1';
      const response = await fetch(urlObject);
      const data = (await response.text()).replaceAll('stacks.bitrise.io/', 'bitrise.io/stacks/');
      return new Response(data, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });
    }

    // This puts access to the tool version catalog behind a consistent set of URLs
    // Additional background: https://bitrise.atlassian.net/browse/BE-2056
    const toolsMatch = urlObject.pathname.match(/^\/stacks\/tools\/v1\/(.*\.json)/);
    if (toolsMatch) {
      const sourceURL = new URL(`https://storage.googleapis.com/bitrise-cli-tool-catalog/${toolsMatch[1]}`)
      const response = await fetch(sourceURL);
      const data = response.status == 200 ? await response.text() : "";
      return new Response(data, {
        status: response.status,
        statusText: response.statusText,
      });
    }

    if (urlObject.pathname.match(/^\/stacks\/.+/)) {
      const originalPath = urlObject.pathname;
      urlObject.pathname = '/stacks/subpage';
      const response = await fetch(urlObject);
      const data = (await response.text()).replace(
        'https://bitrise.io/stacks/subpage',
        `https://bitrise.io${originalPath}`,
      );
      return new Response(data, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });
    }

    if (urlObject.pathname.match(/\/stacks$|stacks\/(.*)/)) {
      urlObject.pathname = '/stacks';
    }

    return await fetch(urlObject);
  },
};
