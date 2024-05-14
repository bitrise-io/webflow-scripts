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
 * @param {string} workerScript
 * @returns {Promise<Function>}
 */
async function importWorker(workerScript) {
  try {
    const data = await fs.promises.readFile(workerScript, 'utf8');
    const workerName = `${workerScript}-${crypto.createHash('md5').update(data).digest("hex")}`;
    if (!importedWorkers[workerName]) {
      eval(data.toString()
        .replace('addEventListener(\'fetch\',', `importedWorkers['${workerName}'] = (`)
        .replaceAll('webflow.bitrise.io', webflowDomain)
      );
      console.log(`Registered new worker: ${workerName}`, importedWorkers[workerName]);
    }
    return importedWorkers[workerName];
  } catch (err) {
    throw err;
  }
}

/**
 * @param {URL} urlObject 
 * @returns {Promise<Function>}
 */
async function getServiceWorker(urlObject) {
  if (urlObject.pathname.match(/^\/integrations/)) {
    return await importWorker("./src/js/integrations/worker.js");
  }
  if (urlObject.pathname.match(/^\/changelog/)) {
    return await importWorker("./src/js/changelog/worker.js");
  }
  return (event) => {
    let urlObject = new URL(event.request.url);
    urlObject.hostname = webflowDomain;
    event.respondWith(fetch(urlObject));
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

    (await getServiceWorker(urlObject))({
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
    });

  }
});

app.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
