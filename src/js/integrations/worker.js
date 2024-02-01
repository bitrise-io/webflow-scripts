const routingRules = [
  [/^\/integrations\/steps\/.+/, '/integrations/steps', 'webflow.bitrise.io'],
  [/\/integrations$|integrations\/(.*)/, '/integrations', 'webflow.bitrise.io'],
];

addEventListener('fetch', event => {
  let urlObject = new URL(event.request.url);
  for (let routingRule of routingRules) {
    const match = urlObject.pathname.match(routingRule[0]);
    if (match) {
      urlObject.hostname = routingRule[2];
      urlObject.pathname = urlObject.pathname.replace(routingRule[0], routingRule[1]);
      event.respondWith(fetch(urlObject));
      break;
    }
  }
});