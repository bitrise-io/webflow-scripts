const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const webpack = require("webpack");
const webpackConfig = require("./webpack.dev.js");
const devMiddleware = require("webpack-dev-middleware");
const hotMiddleware = require("webpack-hot-middleware");

const hostname = process.argv[3] || '127.0.0.1';
const port = 3000;

const webflowDomain = process.argv[2] || 'webflow.bitrise.io';

const importedWorkers = {};

/**
 * @param {string} workerPath
 * @returns {Promise<Function>}
 */
async function importWorker(workerPath) {
  try {
    const workerContent = (await fs.promises.readFile(workerPath, 'utf8')).toString()
      .replaceAll('webflow.bitrise.io', webflowDomain)
      .replaceAll(/\/\*(.|[\n\r])*?\*\//gm, "")
      .replaceAll(/\/\/.*$/g, "");
    const workerName = `${workerPath}-${crypto.createHash('md5').update(workerContent).digest("hex")}`;
    if (!importedWorkers[workerName]) {
      if (workerContent.match(/addEventListener\('fetch',/)) {  // Service Worker Syntax
        eval(`(() => {
          function addEventListener(_, cb) {
            importedWorkers['${workerName}'] = { type: "Service" };
            importedWorkers['${workerName}'].handler = cb;
          };
          ${workerContent}
        })();`);
      }
      if (workerContent.match(/export default {/)) { // ES6 Module Syntax
        eval(`(() => {
          ${workerContent.replace(/export default {/, `
            importedWorkers['${workerName}'] = { type: "ES6 Module" };
            importedWorkers['${workerName}'].handler = {`
          )}
        })();`);
      }
      console.log(`Registered new ${importedWorkers[workerName].type} Worker: ${workerName}`, importedWorkers[workerName].handler);
    }
    return importedWorkers[workerName];
  } catch (err) {
    throw err;
  }
}

/**
 * @param {URL} urlObject 
 * @returns {Promise<{ type: string; handler: Function; }>}
 */
async function getWorker(urlObject) {
  if (urlObject.pathname.match(/^\/integrations/)) {
    return await importWorker("./src/js/integrations/worker.js");
  }
  if (urlObject.pathname.match(/^\/changelog/)) {
    return await importWorker("./src/js/changelog/worker.js");
  }
  return {
    type: "ES6 Module",
    handler: { 
      async fetch(request) {
        let urlObject = new URL(request.url);
        urlObject.hostname = webflowDomain;
        return await fetch(urlObject);
      },
    },
  };
}

const compiler = webpack(webpackConfig);
const devMiddlewareOptions = {
  // writeToDisk: true,
};
const app = express();

app.use(devMiddleware(compiler, devMiddlewareOptions));
if (webpackConfig.mode === "development") app.use(hotMiddleware(compiler));

app.get(/\/.*/, async (req, res) => {
  const urlObject = new URL("http://" + req.hostname + req.url);

  try {

    const content = await fs.promises.readFile(`./dist${urlObject.pathname}`);
    res.statusCode = 200;
    const extname = path.extname(urlObject.pathname);
    if (extname == ".js") res.setHeader('Content-Type', "text/javascript");
    if (extname == ".html") res.setHeader('Content-Type', "text/html");
    if (extname == ".json") res.setHeader('Content-Type', "application/json");
    res.end(content);

  } catch(error) {

    const requestHandler = await getWorker(urlObject);
    const fetchEvent = {
      request: {
        url: urlObject,
      },
      respondWith: async (buffer) => {
        const response = await buffer;
        res.statusCode = response.status;
        res.setHeader('Content-Type', response.headers.get("Content-Type"));
        const text = await response.text();
        res.end(text.replace("https://webflow-scripts.bitrise.io/", "/"));
      }
    };

    if (requestHandler.type === "Service") {
      requestHandler.handler(fetchEvent);
    }

    if (requestHandler.type === "ES6 Module") {
      fetchEvent.respondWith(requestHandler.handler.fetch(fetchEvent.request));
    }
  }
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
