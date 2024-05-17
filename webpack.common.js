const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

module.exports = (mode) => {
  const plugins = [];
  if (mode === 'development') {
    plugins.push(new webpack.HotModuleReplacementPlugin());
  }

  const srcPath = path.resolve(__dirname, 'src');
  const distPath = path.resolve(__dirname, 'dist');
  const entryPoints = {};
  fs.readdirSync(path.resolve(srcPath, 'js')).forEach((fileName) => {
    const match = fileName.match(/^(.*)\.js$/);
    if (match) {
      if (mode === 'development') {
        entryPoints[match[1]] = ['webpack-hot-middleware/client', path.join('js', fileName)];
      } else {
        entryPoints[match[1]] = path.join('js', fileName);
      }
    }
  });

  return {
    mode,
    resolve: {
      modules: [srcPath, 'node_modules'],
    },
    plugins,
    entry: entryPoints,
    output: {
      path: distPath,
      filename: '[name].js',
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
  };
};
