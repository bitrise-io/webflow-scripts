export default {
  async fetch(request) {
    const urlObject = new URL(request.url);

    urlObject.hostname = 'app-benchmark.vercel.app';

    return fetch(urlObject);
  },
};
