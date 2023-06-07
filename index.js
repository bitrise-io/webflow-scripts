const http = require('http');

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  fetch(process.argv[2] + req.url).then(response => {
    res.statusCode = response.status;
    res.setHeader('Content-Type', response.headers.get("Content-Type"));
    return response.text();
  }).then(text => {
    res.end(text);
  });
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});