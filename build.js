const path = require('path');
const webpack = require('webpack');
const webpackConfigBuilder = require('./webpack.config.js');

const webpackBuild = (config) =>
  new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err || stats.hasErrors()) {
        reject(stats);
      } else {
        resolve(stats);
      }
    });
  });

const { build: buildMaintenance } = require('./src/js/maintenance/build.js');

const buildPath = path.resolve(__dirname, 'build');

const ssrWebpackConfig = {
  target: 'node',
  mode: 'production',
  entry: {
    integrations: path.resolve(__dirname, 'src/js/integrations/ssr.js'),
  },
  output: {
    path: buildPath,
    filename: '[name]-ssr.js',
    library: { type: 'commonjs2' },
  },
  resolve: {
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
  },
  externals: ({ request }, callback) => {
    if (request && /^[a-zA-Z@]/.test(request)) {
      callback(null, `commonjs2 ${request}`);
    } else {
      callback();
    }
  },
};

const build = async () => {
  const webpackConfig = webpackConfigBuilder('production');

  // Build project with Webpack
  let webpackStats;
  try {
    webpackStats = await webpackBuild(webpackConfig);
  } catch (error) {
    webpackStats = error;
  }
  if (webpackStats.hasErrors()) {
    process.stderr.write(`Webpack build failed:\n${webpackStats.toString({ colors: true })}\n\n`);
    throw new Error('Webpack build failed');
  } else {
    process.stdout.write(`Webpack build completed successfully:\n${webpackStats.toString({ colors: true })}\n\n`);
  }

  /** @type {webpack.Stats} */
  let webpackSsrStats;
  try {
    webpackSsrStats = await webpackBuild(ssrWebpackConfig);
  } catch (error) {
    webpackSsrStats = error;
  }
  if (webpackSsrStats.hasErrors()) {
    process.stderr.write(`SSR Webpack build failed:\n${webpackSsrStats.toString({ colors: true })}\n\n`);
    throw new Error('SSR Webpack build failed');
  } else {
    process.stdout.write(
      `SSR Webpack build completed successfully:\n${webpackSsrStats.toString({ colors: true })}\n\n`,
    );
  }

  // eslint-disable-next-line global-require
  const { render: renderIntegrations } = require('./build/integrations-ssr.js');
  await renderIntegrations({
    destination: path.resolve(__dirname, webpackConfig.output.path),
    templateHostname: 'bitrise.io',
  });

  // Build maintenance.html (depends on dist/404.js from webpack)
  await buildMaintenance({
    distPath: path.resolve(__dirname, webpackConfig.output.path),
    srcPath: path.resolve(__dirname, 'src'),
  });
};

build().catch((error) => {
  process.stderr.write(`Build failed: ${error.message}\n`);
  process.exit(1);
});
