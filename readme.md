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
import { loadCss } from "./shared/common";

loadCss(require("../css/my-styles.css"));

window.addEventListener('load', async () => {
  console.log('Hello World!');
});
```

After merging into main, it will be available as

```
https://webflow-scripts.bitrise.io/my-script.js
```

## Developing with the local environment

After cloning, 

build scripts with webpack, use `--watch` if needed

```sh
yarn build_dev
```

and start server with

```sh
node index.js "<webflow-environment>" "<local-domain (optional)>"
```

The local server will proxy paths from the `<webflow-environment>` and replace the script that are already embedded in the page with the local one.

### Using Temp Files

Loading an html file from the temp folder will bypass the webflow proxy.

You have to directly reference the script to be used in the temp file, the replace won't happen in this case.