const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const webpack = require('webpack');
const devMiddleware = require('webpack-dev-middleware');
const hotMiddleware = require('webpack-hot-middleware');
const webpackConfig = require('./webpack.config.js');

const hostname = '127.0.0.1';
const port = 3000;

const webflowDomain = process.argv[2] || 'test-e93bfd.webflow.io';

const workers = [];
const importedWorkers = {};

/**
 * @param {string} workerName
 * @param {string} workerPath
 * @returns {Promise<Function>}
 */
async function importWorker(workerName, workerPath) {
  const workerContent = (await fs.promises.readFile(workerPath, 'utf8'))
    .toString()
    .replaceAll('webflow.bitrise.io', webflowDomain)
    .replaceAll(
      `urlObject.hostname = 'web-cdn.bitrise.io';`,
      `urlObject.hostname = '${hostname}'; urlObject.port = ${port}; urlObject.search = 'cdn=1';`, // TODO: make this switchable
    )
    .replaceAll(/\/\*(.|[\n\r])*?\*\//gm, '')
    .replaceAll(/\/\/.*$/g, '');
  const workerNameWithHash = `${workerName}-${crypto.createHash('md5').update(workerContent).digest('hex')}`;
  if (!importedWorkers[workerNameWithHash]) {
    if (workerContent.match(/addEventListener\('fetch',/)) {
      // Service Worker Syntax
      eval(`(() => {
        function addEventListener(_, cb) {
          importedWorkers['${workerNameWithHash}'] = { type: "Service" };
          importedWorkers['${workerNameWithHash}'].name = '${workerName}';
          importedWorkers['${workerNameWithHash}'].handler = cb;
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
          importedWorkers['${workerNameWithHash}'] = { type: "ES6 Module" };
          importedWorkers['${workerNameWithHash}'].name = '${workerName}';
          importedWorkers['${workerNameWithHash}'].handler = {`,
        )}
      })();`);
    }
    process.stdout.write(`[info] Registered new Worker: ${workerName} (${importedWorkers[workerNameWithHash].type})\n`);
  }
  return importedWorkers[workerNameWithHash];
}

/**
 *
 * @param {string}dir
 */
async function discoverWorkers(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });

  await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await discoverWorkers(fullPath);
      } else if (entry.name === 'wrangler.toml') {
        const tomlContent = await fs.promises.readFile(fullPath, 'utf8');
        // Basic TOML parsing - you may want to use a proper TOML parser library
        const config = {};
        const lines = tomlContent.split('\n');
        lines.forEach((line) => {
          const match = line.match(/^(\w+)\s*=\s*["']?([^"'\n]+)["']?/);
          if (match) {
            const [, key, value] = match;
            config[key] = value;
          }
        });

        workers.push({
          name: path.basename(path.dirname(fullPath)),
          path: fullPath,
          config,
        });

        process.stdout.write(`[info] Found worker config: ${fullPath}\n`);
      }
    }),
  );
}

/**
 * @param {URL} urlObject
 * @returns {Promise<{ type: string; handler: Function; }>}
 */
async function getWorker(urlObject) {
  if (workers.length === 0) {
    await discoverWorkers('./src/js');
  }

  const matchedWorker = workers.filter((worker) => {
    let routePattern = worker.config.route.replace('bitrise.io', '^');
    if (routePattern.endsWith('*')) {
      routePattern = routePattern.slice(0, -1);
    } else {
      routePattern = `${routePattern}$`;
    }
    return urlObject.pathname.match(new RegExp(routePattern));
  });

  if (matchedWorker.length > 0) {
    const worker = matchedWorker[0];
    return importWorker(worker.config.name, path.join(path.dirname(worker.path), worker.config.main));
  }

  return {
    type: 'ES6 Module',
    name: 'express-proxy',
    handler: {
      async fetch(request) {
        const url = new URL(request.url);
        url.hostname = webflowDomain;
        return fetch(url);
      },
    },
  };
}

const compiler = webpack(webpackConfig('development'));
const devMiddlewareOptions = {
  // writeToDisk: true,
};
const app = express();

app.use(devMiddleware(compiler, devMiddlewareOptions));
app.use(hotMiddleware(compiler));

app.get(/\/.*/, async (req, res) => {
  const urlObject = new URL(`http://${req.hostname}${req.url}`);

  process.stdout.write(`[info] Handling request to ${urlObject}\n`);

  try {
    let webRootPath = './dist';
    if (urlObject.searchParams.get('cdn') === '1') {
      webRootPath = '.';
    }
    const filePath = `${webRootPath}${urlObject.pathname}`;
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

    process.stdout.write(`[info] Using request handler ${requestHandler.name} (${requestHandler.type})\n`);

    const fetchEvent = {
      request: {
        url: urlObject,
      },
      respondWith: async (buffer) => {
        const response = await buffer;
        res.statusCode = response.status;

        const responseAccessControlAllowOrigin = response.headers.get('Access-Control-Allow-Origin');
        if (responseAccessControlAllowOrigin)
          res.setHeader('Access-Control-Allow-Origin', responseAccessControlAllowOrigin);
        const responseVary = response.headers.get('Vary');
        if (responseVary) res.setHeader('Vary', responseVary);
        const responseContentType = response.headers.get('Content-Type');
        if (responseContentType) res.setHeader('Content-Type', response.headers.get('Content-Type'));
        const responseLocation = response.headers.get('Location');
        if (responseLocation)
          res.setHeader(
            'Location',
            responseLocation.replace(webflowDomain, `${hostname}:${port}`).replace('https', 'http'),
          );

        process.stdout.write(`[info] Serving ${urlObject.href} with status ${res.statusCode}\n`);

        let text = (await response.text())
          .replace("document.location.host === 'test-e93bfd.webflow.io'", 'true')
          .replace('https://webflow-scripts.bitrise.io/', '/');

        // testing the 404 page
        if (text.match(/404 - Page Not Found/) && !text.match(/id="bitrise-status"/)) {
          text = text.replace(
            '</body>',
            `<div id="bitrise-status" style="margin: 1rem auto">
              <a href="https://status.bitrise.io/" rel="noreferrer" target="_blank">Status</a>
            </div>
            <script src="/404.js"></script>
            </body>`,
          );
        }

        res.end(text);
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
  process.stdout.write(`Local dev proxy started: https://${webflowDomain}/ -> http://${hostname}:${port}/\n`);
});
