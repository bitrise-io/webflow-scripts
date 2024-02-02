const http = require('http');
const fs = require('fs');
const path = require('path');

const hostname = '127.0.0.1';
const port = 3000;

const webflowDomain = process.argv[2] || 'webflow.bitrise.io';

const fetchEventHandlers = {};

/**
 * @param {string} workerName 
 * @param {Function} eventHandler 
 */
function addEventListener(workerName, eventHandler) {
  fetchEventHandlers[workerName] = eventHandler;
}

/**
 * @param {string} workerName 
 * @param {string} workerScript 
 */
function includeWorkerScript(workerName, workerScript) {
  fs.readFile(workerScript, 'utf8', (err, data) => {
    if (err) {
      console.log(err);
    } else {
      eval(data.toString()
        .replace('addEventListener(\'fetch\'', `addEventListener('${workerName}'`)
        .replaceAll('webflow.bitrise.io', webflowDomain)
      );    
    }
  });
}

addEventListener('common', event => {
  let urlObject = new URL(event.request.url);
  urlObject.hostname = webflowDomain;
  event.respondWith(fetch(urlObject));
});

includeWorkerScript("integrations", "./src/js/integrations/worker.js");
includeWorkerScript("changelog", "./src/js/changelog/worker.js");

/**
 * @param {URL} urlObject 
 * @returns {Function}
 */
function getFetchEventHandler(urlObject) {
  if (urlObject.pathname.match(/^\/integrations/)) {
    return fetchEventHandlers['integrations'];
  }
  if (urlObject.pathname.match(/^\/changelog/)) {
    return fetchEventHandlers['changelog'];
  }
  return fetchEventHandlers['common'];
}

const server = http.createServer((req, res) => {
  const urlObject = new URL("http://" + req.hostname + req.url);
  fs.promises.readFile(`.${urlObject.pathname}`).then(content => {

    res.statusCode = 200;
    const extname = path.extname(urlObject.pathname);
    if (extname == ".js") res.setHeader('Content-Type', "text/javascript");
    if (extname == ".html") res.setHeader('Content-Type', "text/html");
    if (extname == ".json") res.setHeader('Content-Type', "application/json");
    res.end(content);

  }).catch(error  => {

    getFetchEventHandler(urlObject)({
      request: {
        url: urlObject,
      },
      respondWith: buffer => {
        requestHandled = true;
        buffer.then(response => {
          res.statusCode = response.status;
          res.setHeader('Content-Type', response.headers.get("Content-Type"));
          return response.text();
        }).then(text => {
          res.end(text.replace("https://bitrise-io.github.io/webflow-scripts/", "/dist/"));
        });
      }
    });

  });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});