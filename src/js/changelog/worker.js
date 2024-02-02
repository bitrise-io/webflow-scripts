addEventListener('fetch', event => {
  let urlObject = new URL(event.request.url);
  
  urlObject.hostname = 'webflow.bitrise.io';

  if (urlObject.pathname.match(/^\/changelog\/(.+\.json)$/)) {
    urlObject.hostname = 'discuss.bitrise.io';
    urlObject.pathname = urlObject.pathname.replace(/^\/changelog\/(.+\.json)$/, '/t/$1');
  } else if (urlObject.pathname.match(/^\/changelog\.json$/)) {
    urlObject.hostname = 'discuss.bitrise.io';
    urlObject.pathname = '/c/product-updates/42.json';
  } else if (urlObject.pathname.match(/^\/changelog\/.+/)) {
    urlObject.pathname = '/changelog/topic';
  }

  event.respondWith(fetch(urlObject));
})