const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://bitrise.io';

/**
 * Strips the base URL prefix so bitrise.io absolute URLs are treated as internal paths.
 * @param {string} target
 * @returns {string}
 */
const canonicalize = (target) => {
  if (target.startsWith(BASE_URL)) {
    return target.slice(BASE_URL.length) || '/';
  }
  return target;
};

/**
 * @param {string} target
 * @returns {boolean}
 */
const isInternal = (target) => target.startsWith('/');

/**
 * @param {string} content
 * @returns {Array<{source: string, target: string}>}
 */
const parseCsv = (content) => {
  const lines = content.split('\n').filter((line) => line.trim());
  const [header, ...rows] = lines;
  if (header.trim() !== 'source,target') {
    throw new Error(`Unexpected CSV header: "${header}" (expected "source,target")`);
  }
  return rows.map((line) => {
    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) throw new Error(`Invalid CSV row (no comma): "${line}"`);
    return {
      source: line.slice(0, commaIdx).trim(),
      target: line.slice(commaIdx + 1).trim(),
    };
  });
};

/**
 * @param {Array<{source: string, target: string}>} rows
 * @returns {string}
 */
const serializeCsv = (rows) => {
  return `source,target\n${rows.map(({ source, target }) => `${source},${target}`).join('\n')}\n`;
};

/**
 * Follows the redirect chain from source to its final destination.
 * Assumes all values in redirectMap are already canonicalized.
 * @param {string} source
 * @param {Map<string, string>} redirectMap
 * @returns {{ target: string|null, chain: string[], isLoop: boolean }}
 */
const resolveChain = (source, redirectMap) => {
  const visited = new Set();
  const chain = [source];
  let current = source;

  let next = redirectMap.get(current);
  while (next !== undefined) {
    const target = next;

    if (!isInternal(target)) {
      chain.push(target);
      return { target, chain, isLoop: false };
    }

    if (visited.has(target)) {
      chain.push(target);
      return { target: null, chain, isLoop: true };
    }

    visited.add(current);
    chain.push(target);
    current = target;
    next = redirectMap.get(current);
  }

  return { target: current, chain, isLoop: false };
};

/**
 * Reads a redirect CSV, resolves all chains, detects loops, and writes a normalized CSV.
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {boolean} dryRun
 */
const normalizeRedirects = async (inputPath, outputPath, dryRun = false) => {
  const content = await fs.promises.readFile(inputPath, 'utf8');
  const rows = parseCsv(content);

  const redirectMap = new Map();
  const duplicates = [];
  rows.forEach(({ source, target }) => {
    const canonical = canonicalize(target);
    if (redirectMap.has(source)) {
      duplicates.push({ source, prev: redirectMap.get(source), next: canonical });
    }
    redirectMap.set(source, canonical);
  });

  if (duplicates.length > 0) {
    process.stderr.write(`\nDuplicate sources found (last entry wins, ${duplicates.length}):\n`);
    duplicates.forEach(({ source, prev, next }) => {
      process.stderr.write(`  ${source}: "${prev}" overridden by "${next}"\n`);
    });
  }

  const loops = [];
  const chains = [];
  const normalized = [];
  const processed = new Set();

  rows.forEach(({ source }) => {
    if (processed.has(source)) return;
    processed.add(source);

    const { target, chain, isLoop } = resolveChain(source, redirectMap);

    if (isLoop) {
      loops.push(chain);
    } else {
      if (chain.length > 2) chains.push(chain);
      normalized.push({ source, target });
    }
  });

  if (chains.length > 0) {
    process.stdout.write(`\nChains resolved (${chains.length}):\n`);
    chains.forEach((chain) => {
      process.stdout.write(`  ${chain.join(' → ')}\n`);
    });
  }

  if (loops.length > 0) {
    process.stderr.write(`\nRedirect loops detected — excluded from output (${loops.length}):\n`);
    loops.forEach((loop) => {
      process.stderr.write(`  ${loop.join(' → ')}\n`);
    });
  }

  process.stdout.write(`\nSummary:\n`);
  process.stdout.write(`  Input rows:      ${rows.length}\n`);
  process.stdout.write(`  Chains resolved: ${chains.length}\n`);
  process.stdout.write(`  Loops excluded:  ${loops.length}\n`);
  process.stdout.write(`  Output rows:     ${normalized.length}\n`);

  if (!dryRun) {
    await fs.promises.writeFile(outputPath, serializeCsv(normalized));
    process.stdout.write(`\nNormalized CSV written to: ${outputPath}\n`);
  } else {
    process.stdout.write(`\n(dry run — no file written)\n`);
  }
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const positional = args.filter((arg) => !arg.startsWith('--'));

  if (positional.length === 0) {
    process.stderr.write('Usage: node normalize-redirects.js <input.csv> [output.csv] [--dry-run]\n');
    process.exit(1);
  }

  const inputPath = path.resolve(positional[0]);
  const outputPath = positional[1]
    ? path.resolve(positional[1])
    : path.join(
        path.dirname(inputPath),
        `${path.basename(inputPath, path.extname(inputPath))}-normalized${path.extname(inputPath)}`,
      );

  normalizeRedirects(inputPath, outputPath, dryRun)
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      process.stderr.write(`Error: ${err.message}\n`);
      process.exit(1);
    });
}

module.exports = { normalizeRedirects, resolveChain, parseCsv };
