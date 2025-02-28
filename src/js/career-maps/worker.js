/**
 *
 * @param {Promise<Response>} originalResponse
 * @returns {Promise<Response>}
 */
async function addCorsHeaders(originalResponse) {
  let response = await originalResponse;
  // Recreate the response so you can modify the headers

  response = new Response(response.body, response);
  // Set CORS headers

  response.headers.set('Access-Control-Allow-Origin', '*');

  // Append to/Add Vary header so browser will cache response correctly
  response.headers.append('Vary', 'Origin');

  return response;
}

addEventListener('fetch', (event) => {
  const urlObject = new URL(event.request.url);
  let useCors = true;

  urlObject.hostname = 'webflow.bitrise.io';

  if (urlObject.pathname.match(/^\/careers\/maps\/data\.json$/)) {
    urlObject.hostname = 'web-cdn.bitrise.io';
    urlObject.pathname = 'career-maps.json';
    useCors = true;
  } else if (urlObject.pathname.match(/^\/careers\/maps\/.+/)) {
    urlObject.pathname = '/careers/maps/team';
  }

  if (useCors) {
    event.respondWith(addCorsHeaders(fetch(urlObject)));
  } else {
    event.respondWith(fetch(urlObject));
  }
});
