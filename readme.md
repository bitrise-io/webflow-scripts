# Webflow Scripts

## Development

After cloning, 

build scripts with webpack, use `--watch` if needed

```
yarn build_dev
```

and start server with

```
node index.js <webflow-environment>
```

The local server will proxy paths from the `<webflow-environment>` and replace the script with the local one.

### Using Temp Files

Loading an html file from the temp folder will bypass the webflow proxy.

You have to directly reference the script to be used in the temp file, the replce won't happen in this case.