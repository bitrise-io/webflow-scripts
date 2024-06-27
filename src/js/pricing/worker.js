export default {
  async fetch(request) {
    const urlObject = new URL(request.url);

    urlObject.hostname = 'webflow.bitrise.io';

    if (urlObject.search.match(/us=1/) || request.headers.get('cf-ipcountry') === 'US') {
      urlObject.pathname = '/plans-pricing-us';
      const response = await fetch(urlObject);
      const data = (await response.text()).replace('plans-pricing-us', 'plans-pricing');
      return new Response(data, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });
    }

    urlObject.pathname = urlObject.pathname.replace('plans-pricing-test', 'plans-pricing');

    return fetch(urlObject);
  },
};
