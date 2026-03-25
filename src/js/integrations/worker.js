const ORIGIN_HOST = 'bitrise.io';

const setCorsHeaders = (response) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.append('Vary', 'Origin');
  return response;
};

export default {
  async fetch(request) {
    const urlObject = new URL(request.url);
    const canonical = new URL(request.url);

    if (urlObject.pathname.match(/^\/integrations-proxy$/)) {
      return setCorsHeaders(new Response('OK'));
    }

    urlObject.hostname = ORIGIN_HOST;
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
