export default {
  async fetch(request) {
    const urlObject = new URL(request.url);

    urlObject.hostname = 'webflow.bitrise.io';

    if (urlObject.pathname.match(/^\/stacks\/.+\/.+/)) {
      urlObject.pathname = '/stacks/subpage';
    } else if (urlObject.pathname.match(/\/stacks$|stacks\/(.*)/)) {
      urlObject.pathname = '/stacks';
    }

    return await fetch(urlObject);
  },
};

/* test 2 */
