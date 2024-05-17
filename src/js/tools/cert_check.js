const { exec } = require('child_process');

const domain = 'bitrise.io';
const server = 'proxy-ssl.webflow.com';
const port = 443;
const cmd = `echo -n Q | openssl s_client -servername ${domain} -connect ${server}:${port} | openssl x509 -noout -dates`;

exec(cmd, (_, stdout) => {
  const matchStart = stdout.match(/notBefore=(.*)/);
  const startDate = new Date(matchStart[1]);
  process.stdout.write(`Start: ${startDate}\n`);
  const matchEnd = stdout.match(/notAfter=(.*)/);
  const expireDate = new Date(matchEnd[1]);
  process.stdout.write(`Expires: ${expireDate}\n`);
});
