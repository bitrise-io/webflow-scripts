const http = require('http');
const fs = require('fs');
const path = require('path');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  const url = new URL("http://" + req.hostname + req.url);
  const filePath = '.' + url.pathname;
  
  fs.readFile(filePath, (error, content) => {
    if (!error) {

      res.statusCode = 200;
      const extname = path.extname(filePath);
      if (extname == ".js") res.setHeader('Content-Type', "text/javascript");
      if (extname == ".html") res.setHeader('Content-Type', "text/html");
      res.end(content);

    } else {

      fetch(process.argv[2] + req.url).then(response => {
        res.statusCode = response.status;
        res.setHeader('Content-Type', response.headers.get("Content-Type"));
        return response.text();
      }).then(text => {
        res.end(text.replace("https://bitrise-io.github.io/webflow-scripts/", "/dist/"));
      });

    }
  });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});