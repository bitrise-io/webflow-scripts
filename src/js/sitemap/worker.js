export default {
  async fetch(request) {
    try {
      const { pathname } = new URL(request.url);

      if (pathname.startsWith('/sitemap.xml')) {
        return fetch('https://web-cdn.bitrise.io/sitemap.xml');
      }

      return fetch(request.url);
    } catch (e) {
      return new Response(e.stack, { status: 500 });
    }
  },
};
