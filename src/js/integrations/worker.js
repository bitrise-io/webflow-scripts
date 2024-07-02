export default {
  async fetch(request) {
    const urlObject = new URL(request.url);
    const canonical = new URL(request.url);

    urlObject.hostname = 'webflow.bitrise.io';
    canonical.hostname = 'bitrise.io';

    if (urlObject.pathname.match(/^\/integrations\/steps\/.+/)) {
      urlObject.pathname = '/integrations/step';
    } else if (urlObject.pathname.match(/^\/integrations\/steps\/?$/)) {
      urlObject.pathname = '/integrations';
      return Response.redirect(urlObject, 301);
    } else if (urlObject.pathname.match(/^\/integrations\/?$/)) {
      urlObject.pathname = '/integrations';
    }

    canonical.pathname = canonical.pathname.replace(/\/$/, '');

    const response = await fetch(urlObject);
    const data = await response.text();
    return new Response(
      data.replace(
        'href="https://bitrise.io/integrations/step" rel="canonical"',
        `href="${canonical.href}" rel="canonical"`,
      ),
      {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      },
    );
  },
};
