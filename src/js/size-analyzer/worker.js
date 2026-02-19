export default {
  async fetch(request) {
    const urlObject = new URL(request.url);

    urlObject.hostname = 'bundle-analyzer-omega.vercel.app';

    return fetch(urlObject);
  },
};
