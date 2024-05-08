const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, "src");
const distPath = path.resolve(__dirname, "dist");
const entryPoints = {};
fs.readdirSync(path.resolve(srcPath, "js")).forEach(fileName => {
  const match = fileName.match(/^(.*)\.js$/);
  if (match) entryPoints[match[1]] = path.join("js", fileName);
});

module.exports = {
  resolve: {
    modules: [
        srcPath,
        "node_modules"
    ]
  },
  entry: entryPoints,
  output: {
    path: distPath,
    filename: '[name].js',
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
};