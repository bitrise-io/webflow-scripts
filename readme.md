# Webflow Scripts

## Adding Standalone Non-compiled Scripts

Create the file in the `dist/standalone/` folder, like 

```
dist/standalone/my-script.js
```

After merging into main, it will be available as

```
https://webflow-scripts.bitrise.io/standalone/my-script.js
```

## Adding compiled scripts

Create the entry point in the `src/js/` folder. You implement these script like any other JS project with ES6 modules. You can import the CSS files too, they will be included in the compiled bundle. For example:

CSS: `src/css/my-styles.css`

JS: `src/js/my-script.js`
```javascript
import "../css/my-styles.css";

window.addEventListener('load', async () => {
  console.log('Hello World!');
});
```

After merging into main, it will be available as

```
https://webflow-scripts.bitrise.io/my-script.js
```

## Developing with the local environment

After cloning, install dependencies

```sh
npm install
```

and start local proxy server with *Webflow staging (default)*

```sh
npm run dev
```

or with *Webflow production*

```sh
npm run dev -- bitrise.io
```

The server will proxy paths from staging or prod and replace already embedded scripts in the page with the local one.

The server automatically builds bundles with webpack and - if the script entry points are [HMR enabled](https://webpack.js.org/api/hot-module-replacement) - replaces them on change.
