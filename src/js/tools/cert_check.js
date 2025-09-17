const { exec } = require('child_process');

const dnsConfig = {
  'bitrise.io': 'proxy-ssl.webflow.com',
  'docs.bitrise.io': 'bitrise-io.github.io',
};

const checkDomainAccess = (domain) => {
  return new Promise((resolve, reject) => {
    const cmd = `curl -I -s --connect-timeout 10 https://${domain}/`;
    exec(cmd, (_, stdout) => {
      const httpStatus = stdout.match(/HTTP\/[0-9.]+ (\d{3})/);
      if (!httpStatus || httpStatus.length < 2) {
        reject(new Error(`Failed to parse HTTP status code from curl output:\n${stdout}`));
        return;
      }
      const cloudflareRequestId = stdout.match(/cf-ray: (\S+-[A-Z]{3})/);
      resolve({
        status: parseInt(httpStatus[1], 10),
        cloudflareRequestId: cloudflareRequestId ? cloudflareRequestId[1] : null,
      });
    });
  });
};

const certCheck = (externalDomain, originServer) => {
  return new Promise((resolve, reject) => {
    const cmd = `echo -n Q | openssl s_client -servername ${externalDomain} -connect ${originServer}:443 | openssl x509 -noout -dates`;
    exec(cmd, (_, stdout) => {
      const matchStart = stdout.match(/notBefore=(.*)/);
      const matchEnd = stdout.match(/notAfter=(.*)/);
      if (!matchStart || !matchEnd) {
        reject(new Error(`Failed to parse certificate dates from output:\n${stdout}`));
        return;
      }
      checkDomainAccess(externalDomain)
        .then((status) => {
          resolve({
            domain: externalDomain,
            server: originServer,
            start: new Date(matchStart[1]),
            expire: new Date(matchEnd[1]),
            httpStatus: status.status,
            cloudflareRequestId: status.cloudflareRequestId,
          });
        })
        .catch((err) => {
          reject(err);
        });
    });
  });
};

if (require.main === module) {
  const domain = process.argv[2];
  if (!domain || !(domain in dnsConfig)) {
    process.stderr.write(`Usage: node cert_check.js <domain>\n`);
    process.stderr.write(`Where <domain> is one of: ${Object.keys(dnsConfig).join(', ')}\n`);
    process.exit(1);
  }
  const server = dnsConfig[domain];

  process.stdout.write(`Checking certificate for ${domain} (server: ${server}:443)\n`);
  certCheck(domain, server)
    .then((result) => {
      const now = new Date();
      const daysLeft = Math.round((result.expire - now) / (1000 * 60 * 60 * 24));
      process.stdout.write(`Certificate for ${result.domain} (served by ${result.server}):\n`);
      process.stdout.write(`  Valid from: ${result.start.toISOString()}\n`);
      process.stdout.write(
        `  Valid until: ${result.expire.toISOString()} (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)\n`,
      );

      if (result.httpStatus === 200) {
        process.stdout.write(`Domain ${domain} is accessible (HTTP ${result.httpStatus})\n`);
      } else {
        process.stdout.write(`Warning: Domain ${domain} returned HTTP ${result.httpStatus}\n`);
      }
      if (result.cloudflareRequestId) {
        process.stdout.write(`  (served via Cloudflare, cf-ray: ${result.cloudflareRequestId})\n`);
      } else {
        process.stdout.write(`  (not served via Cloudflare)\n`);
      }
      process.exit(0);
    })
    .catch((err) => {
      process.stderr.write(`Error: ${err.message}\n`);
      process.exit(1);
    });
}

module.exports = { certCheck };
