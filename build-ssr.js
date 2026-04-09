const path = require('path');
const webpack = require('webpack');

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

const buildPath = path.resolve(__dirname, 'build');
const distPath = path.resolve(__dirname, 'dist');

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
    destination: distPath,
    templateHostname: 'bitrise.io',
  });
};

build().catch((error) => {
  process.stderr.write(`SSR build failed: ${error.message}\n`);
  process.exit(1);
});
