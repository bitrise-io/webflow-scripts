export default {
  async fetch(request) {
    const urlObject = new URL(request.url);

    urlObject.hostname = 'webflow.bitrise.io';

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

    if (urlObject.pathname.match(/^\/stacks\/.+\/.+/)) {
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

/* test 6 */
