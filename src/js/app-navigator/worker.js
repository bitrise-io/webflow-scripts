export default {
  async fetch(request) {
    const urlObject = new URL(request.url);

    urlObject.hostname = 'benchmark.bitrise.io';

    return fetch(urlObject);
  },
};
