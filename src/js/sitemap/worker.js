/**
 * Serves bitrise.io/sitemap.xml from the file the sitemap_generator workflow uploads to the CDN bucket.
 * The route only covers /sitemap.xml, so every request is a sitemap request.
 */
const SITEMAP_URL = 'https://web-cdn.bitrise.io/sitemap.xml';

export default {
  async fetch() {
    try {
      // The bucket's caching headers (max-age=3600) and ETag pass through to the client.
      return await fetch(SITEMAP_URL);
    } catch (err) {
      return new Response('Sitemap unavailable', { status: 502 });
    }
  },
};
