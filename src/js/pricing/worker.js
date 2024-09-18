export default {
  async fetch(request) {
    const urlObject = new URL(request.url);

    urlObject.hostname = 'webflow.bitrise.io';

    const actualPath = 'plans-pricing';
    const variantPath = 'plans-pricing-pro-plan-variant';
    const variantCondition = request.headers.get('cf-ipcountry') === 'US';

    if (urlObject.search.match(new RegExp(`variant=${variantPath}`)) || variantCondition) {
      urlObject.pathname = `/${variantPath}`;
      const response = await fetch(urlObject);
      const data = (await response.text()).replace(variantPath, actualPath);
      return new Response(data, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });
    }

    return fetch(urlObject);
  },
};
