/**
 * Assembles the deployable navigation release from the two build outputs:
 *
 *   --component  the webpack bundle (dist/bitrise-navigation.js)
 *   --data       the scraped Webflow payload (dist/bitrise-navigation-loader.js, from build.js)
 *   --out        where to write the release (dist/release)
 *
 * The release directory mirrors the layout of the CDN bucket:
 *
 *   bitrise-navigation.js                          generic bootstrap, stable URL (what pages embed)
 *   bitrise-navigation-loader.js                   generic data loader, stable URL (for already cached components)
 *   bitrise-navigation/bitrise-navigation.<hash>.js  the component, immutable
 *   bitrise-navigation/data.<hash>.js              the payload, immutable
 *   bitrise-navigation/manifest.js                 points at the latest hashed files (short cache, cache busted)
 *   bitrise-navigation/manifest.json               the same manifest for server side consumers
 *
 * Only the manifest changes when a new version is released, so the stable files can be cached for a long time and
 * the hashed files forever. Output depends on the input bytes only, so unchanged inputs give an identical release.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_BASE = 'https://web-cdn.bitrise.io/';
const ASSET_DIR = 'bitrise-navigation';
// How often a page re-checks the manifest. The manifest URL carries this bucket as a query string, so a
// change is picked up within one bucket regardless of the CDN's own cache settings.
const MANIFEST_BUCKET_MS = 5 * 60 * 1000;

const shortHash = (content) => crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);

/**
 * Script that loads the manifest (cache busted per time bucket) and then calls `onManifest(manifest)`.
 * @param {string} base
 * @param {string} onManifestBody - JS statements run once the manifest is available (variable: `m`)
 * @returns {string}
 */
function manifestLoaderScript(base, onManifestBody) {
  return `(function () {
  var base = ${JSON.stringify(base)};
  var s = document.createElement('script');
  s.src = base + ${JSON.stringify(`${ASSET_DIR}/manifest.js`)} + '?v=' + Math.floor(Date.now() / ${MANIFEST_BUCKET_MS});
  s.onload = function () {
    var m = window.bitriseNavigationManifest;
    if (!m) return;
${onManifestBody}
  };
  document.head.appendChild(s);
})();
`;
}

/**
 * The stable entry point pages embed. It contains no version information, so it never needs to change when
 * the navigation does: it only finds the current manifest and loads the component it names.
 * @param {string} base
 * @returns {string}
 */
function bootstrapScript(base) {
  const guarded = manifestLoaderScript(
    base,
    `    var preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'script';
    preload.href = m.base + m.data;
    document.head.appendChild(preload);
    var c = document.createElement('script');
    c.src = m.base + m.component;
    document.head.appendChild(c);`,
  );
  return `if (!window.bitriseNavigationBootstrapped) {
  window.bitriseNavigationBootstrapped = true;
${guarded}}
`;
}

/**
 * Stable data loader URL. Components released before the manifest existed inject this file; it forwards to the
 * current hashed payload. Newer components read the payload URL from the manifest and never request it.
 * @param {string} base
 * @returns {string}
 */
function legacyLoaderScript(base) {
  return manifestLoaderScript(
    base,
    `    var d = document.createElement('script');
    d.src = m.base + m.data;
    document.head.appendChild(d);`,
  );
}

/**
 * @param {{ component: string, data: string, out: string, base?: string }} options
 * @returns {Promise<{ manifest: object, files: string[] }>}
 */
async function release({ component, data, out, base = DEFAULT_BASE }) {
  const baseUrl = base.endsWith('/') ? base : `${base}/`;
  const componentSource = await fs.promises.readFile(component);
  const dataSource = await fs.promises.readFile(data);

  const componentFile = `${ASSET_DIR}/bitrise-navigation.${shortHash(componentSource)}.js`;
  const dataFile = `${ASSET_DIR}/data.${shortHash(dataSource)}.js`;
  const manifest = {
    version: shortHash(`${componentFile}\n${dataFile}`),
    base: baseUrl,
    component: componentFile,
    data: dataFile,
  };

  const outputs = {
    [componentFile]: componentSource,
    [dataFile]: dataSource,
    [`${ASSET_DIR}/manifest.json`]: `${JSON.stringify(manifest, null, 2)}\n`,
    [`${ASSET_DIR}/manifest.js`]: `window.bitriseNavigationManifest = ${JSON.stringify(manifest)};\n`,
    'bitrise-navigation.js': bootstrapScript(baseUrl),
    'bitrise-navigation-loader.js': legacyLoaderScript(baseUrl),
  };

  await fs.promises.rm(out, { recursive: true, force: true });
  await Promise.all(
    Object.entries(outputs).map(async ([file, content]) => {
      const target = path.join(out, file);
      await fs.promises.mkdir(path.dirname(target), { recursive: true });
      await fs.promises.writeFile(target, content);
    }),
  );

  return { manifest, files: Object.keys(outputs).sort() };
}

/**
 * @param {string[]} argv - `--name value` pairs
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, '')] = argv[i + 1];
  }
  return args;
}

if (require.main === module) {
  const { component, data, out, base } = parseArgs(process.argv.slice(2));
  if (!component || !data || !out) {
    process.stderr.write('Usage: node release.js --component <file> --data <file> --out <dir> [--base <url>]\n');
    process.exit(1);
  }
  release({ component, data, out, base })
    .then(({ manifest, files }) => {
      process.stdout.write(`Release ${manifest.version} written to ${out}:\n`);
      files.forEach((file) => process.stdout.write(`  ${file}\n`));
    })
    .catch((error) => {
      process.stderr.write(`Release failed: ${error.message}\n`);
      process.exit(1);
    });
}

module.exports = { release, bootstrapScript, legacyLoaderScript, MANIFEST_BUCKET_MS };
