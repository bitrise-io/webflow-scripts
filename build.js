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
