const http = require('http');
const fs = require('fs');
const path = require('path');

const hostname = '127.0.0.1';
const port = 3000;

/**
 * 
 * @param {URL} urlObject 
 * @param {RegExp} pattern 
 * @param {string} pathname 
 * @param {string} hostname 
 * @returns {URL}
 */
function handleRouting(urlObject, pattern, pathname, hostname) {
  const match = urlObject.pathname.match(pattern);
  if (match) {
    urlObject.hostname = hostname;
    urlObject.pathname = urlObject.pathname.replace(pattern, pathname);
    return urlObject;
  }
  return null;
}

const webflowDomain = process.argv[2];

const routingRules = [
  [/^\/integrations\/steps\/.+/, '/integrations/steps', webflowDomain],
  [/\/integrations$|integrations\/(.*)/, '/integrations', webflowDomain],


  [/(.*)/, '$1', webflowDomain],
];

const server = http.createServer((req, res) => {
  const urlObject = new URL("http://" + req.hostname + req.url);
  fs.promises.readFile(`.${urlObject.pathname}`).then(content => {
    res.statusCode = 200;
    const extname = path.extname(urlObject.pathname);
    if (extname == ".js") res.setHeader('Content-Type', "text/javascript");
    if (extname == ".html") res.setHeader('Content-Type', "text/html");
    res.end(content);
  }).catch(error  => {
    for (let routingRule of routingRules) {
      const target = handleRouting(urlObject, ...routingRule);
      if (target) {
        fetch(target).then(response => {
          res.statusCode = response.status;
          res.setHeader('Content-Type', response.headers.get("Content-Type"));
          return response.text();
        }).then(text => {
          res.end(text.replace("https://bitrise-io.github.io/webflow-scripts/", "/dist/"));
        });
        break;
      }
    }
  });

});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});