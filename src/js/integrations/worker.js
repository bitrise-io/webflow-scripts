addEventListener('fetch', (event) => {
  const urlObject = new URL(event.request.url);

  urlObject.hostname = 'webflow.bitrise.io';

  if (urlObject.pathname.match(/^\/integrations\/steps\/.+/)) {
    urlObject.pathname = '/integrations/step';
  } else if (urlObject.pathname.match(/^\/integrations\/?$/)) {
    urlObject.pathname = '/integrations';
  }

  event.respondWith(fetch(urlObject));
});

/*
bitrise.io/integrations/steps/* -> webflow.bitrise.io/integrations/steps
bitrise.io/integrations -> webflow.bitrise.io/integrations
bitrise.io/* -> webflow.bitrise.io/*

webflow.bitrise.io/integrations
*/
