const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const webpack = require('webpack');
const devMiddleware = require('webpack-dev-middleware');
const hotMiddleware = require('webpack-hot-middleware');
const webpackConfig = require('./webpack.dev.js');

const hostname = process.argv[3] || '127.0.0.1';
const port = 3000;

const webflowDomain = process.argv[2] || 'webflow.bitrise.io';

const importedWorkers = {};

/**
 * @param {string} workerPath
 * @returns {Promise<Function>}
 */
async function importWorker(workerPath) {
  const workerContent = (await fs.promises.readFile(workerPath, 'utf8'))
    .toString()
    .replaceAll('webflow.bitrise.io', webflowDomain)
    .replaceAll(/\/\*(.|[\n\r])*?\*\//gm, '')
    .replaceAll(/\/\/.*$/g, '');
  const workerName = `${workerPath}-${crypto.createHash('md5').update(workerContent).digest('hex')}`;
  if (!importedWorkers[workerName]) {
    if (workerContent.match(/addEventListener\('fetch',/)) {
      // Service Worker Syntax
      eval(`(() => {
        function addEventListener(_, cb) {
          importedWorkers['${workerName}'] = { type: "Service" };
          importedWorkers['${workerName}'].handler = cb;
        };
        ${workerContent}
      })();`);
    }
    if (workerContent.match(/export default {/)) {
      // ES6 Module Syntax
      eval(`(() => {
        ${workerContent.replace(
          /export default {/,
          `
          importedWorkers['${workerName}'] = { type: "ES6 Module" };
          importedWorkers['${workerName}'].handler = {`,
        )}
      })();`);
    }
    process.stdout.write(`[info] Registered new ${importedWorkers[workerName].type} Worker: ${workerName}\n`);
  }
  return importedWorkers[workerName];
}

/**
 * @param {URL} urlObject
 * @returns {Promise<{ type: string; handler: Function; }>}
 */
async function getWorker(urlObject) {
  if (urlObject.pathname.match(/^\/integrations/)) {
    return importWorker('./src/js/integrations/worker.js');
  }
  if (urlObject.pathname.match(/^\/changelog/)) {
    return importWorker('./src/js/changelog/worker.js');
  }
  if (urlObject.pathname.match(/^\/stacks/)) {
    return importWorker('./src/js/stacks/worker.js');
  }
  return {
    type: 'ES6 Module',
    handler: {
      async fetch(request) {
        const url = new URL(request.url);
        url.hostname = webflowDomain;
        return fetch(url);
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
if (webpackConfig.mode === 'development') app.use(hotMiddleware(compiler));

app.get(/\/.*/, async (req, res) => {
  const urlObject = new URL(`http://${req.hostname}${req.url}`);

  process.stdout.write(`[info] Handling request to ${urlObject}\n`);

  try {
    const filePath = `./dist${urlObject.pathname}`;
    const content = await fs.promises.readFile(filePath);
    res.statusCode = 200;
    const extname = path.extname(urlObject.pathname);
    if (extname === '.js') res.setHeader('Content-Type', 'text/javascript');
    if (extname === '.html') res.setHeader('Content-Type', 'text/html');
    if (extname === '.json') res.setHeader('Content-Type', 'application/json');

    process.stdout.write(`[info] Serving local file ${filePath}\n`);

    res.end(content);
  } catch (error) {
    const requestHandler = await getWorker(urlObject);

    process.stdout.write(`[info] Using request handler ${requestHandler.type}\n`);

    const fetchEvent = {
      request: {
        url: urlObject,
      },
      respondWith: async (buffer) => {
        const response = await buffer;
        res.statusCode = response.status;

        const responseContentType = response.headers.get('Content-Type');
        if (responseContentType) res.setHeader('Content-Type', response.headers.get('Content-Type'));
        const responseLocation = response.headers.get('Location');
        if (responseLocation)
          res.setHeader(
            'Location',
            responseLocation.replace(webflowDomain, `${hostname}:${port}`).replace('https', 'http'),
          );

        const text = await response.text();

        process.stdout.write(`[info] Serving response with status ${res.statusCode}\n`);

        res.end(
          text
            .replace("document.location.host === 'test-e93bfd.webflow.io'", 'true')
            .replace('https://webflow-scripts.bitrise.io/', '/'),
        );
      },
    };

    if (requestHandler.type === 'Service') {
      requestHandler.handler(fetchEvent);
    }

    if (requestHandler.type === 'ES6 Module') {
      fetchEvent.respondWith(requestHandler.handler.fetch(fetchEvent.request));
    }
  }
});

app.listen(port, hostname, () => {
  process.stdout.write(`Server running at http://${hostname}:${port}/\n`);
});
