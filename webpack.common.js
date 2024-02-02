const path = require('path');

module.exports = {
  resolve: {
    modules: [
        path.resolve(__dirname, "src"),
        "node_modules"
    ]
  },
  entry: {
    integrations: "js/integrations.js",
    steps:        "js/steps.js",
    careers:      "js/careers.js",
    changelog:    "js/changelog.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
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