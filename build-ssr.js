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

// Usage: node build-ssr.js [integrations] [career-maps] — renders the named pages, or all of them without names.
const renderers = ['integrations', 'career-maps'];
const selectedRenderers = process.argv.slice(2);
const unknownRenderers = selectedRenderers.filter((name) => !renderers.includes(name));
if (unknownRenderers.length) {
  process.stderr.write(`Unknown SSR pages: ${unknownRenderers.join(', ')} (known: ${renderers.join(', ')})\n`);
  process.exit(1);
}

const ssrWebpackConfig = {
  target: 'node',
  mode: 'production',
  entry: {
    integrations: path.resolve(__dirname, 'src/js/integrations/ssr.js'),
    'career-maps': path.resolve(__dirname, 'src/js/career-maps/ssr.js'),
  },
  output: {
    path: buildPath,
    filename: '[name]-ssr.js',
    library: { type: 'commonjs2' },
  },
  resolve: {
    modules: [path.resolve(__dirname, 'src'), 'node_modules'],
  },
  module: {
    rules: [
      {
        resourceQuery: /raw/,
        type: 'asset/source',
      },
      {
        // The same URLs as in the browser bundle (see webpack.config.js), where the images are published.
        test: /\.(png|jpe?g|gif|svg|webp)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext]',
          publicPath: 'https://webflow-scripts.bitrise.io/',
          emit: false,
        },
      },
    ],
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

  const names = selectedRenderers.length ? selectedRenderers : renderers;
  // eslint-disable-next-line no-restricted-syntax
  for (const name of names) {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const { render } = require(`./build/${name}-ssr.js`);
    // eslint-disable-next-line no-await-in-loop
    await render({
      destination: distPath,
      templateHostname: 'bitrise.io',
    });
  }
};

build().catch((error) => {
  process.stderr.write(`SSR build failed: ${error.message}\n`);
  process.exit(1);
});
