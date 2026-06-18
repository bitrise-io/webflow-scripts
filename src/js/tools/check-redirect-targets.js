const fs = require('fs');
const path = require('path');
const { parseCsv } = require('./normalize-redirects');

const DEFAULT_BASE_URL = 'https://bitrise.io';
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_TIMEOUT_MS = 10_000;
const BATCH_DELAY_MS = 100;

const resolveUrl = (target, baseUrl) => {
  if (target.startsWith('/')) return baseUrl.replace(/\/$/, '') + target;
  return target;
};

const categorizeStatus = (statusCode) => {
  if (statusCode === null) return 'unreachable';
  if (statusCode >= 200 && statusCode < 300) return 'ok';
  if (statusCode >= 300 && statusCode < 400) return 'redirecting';
  if (statusCode === 404) return 'broken';
  return 'error';
};

const fetchWithFallback = async (url, signal) => {
  let res;
  try {
    res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal });
    if (res.status === 405) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal });
    }
  } catch (headErr) {
    if (headErr.name === 'AbortError') throw headErr;
    res = await fetch(url, { method: 'GET', redirect: 'follow', signal });
  }
  return res;
};

const checkUrl = async (source, target, baseUrl, signal) => {
  const resolvedUrl = resolveUrl(target, baseUrl);
  const start = Date.now();
  try {
    const res = await fetchWithFallback(resolvedUrl, signal);
    const responseTime = Date.now() - start;
    const finalUrl = res.url && res.url !== resolvedUrl ? res.url : null;
    const status = res.status;
    return {
      source,
      target,
      resolvedUrl,
      status,
      finalUrl,
      responseTime,
      category: finalUrl !== null && categorizeStatus(status) === 'ok' ? 'redirecting' : categorizeStatus(status),
      error: null,
    };
  } catch (err) {
    const responseTime = Date.now() - start;
    const isTimeout = err.name === 'AbortError';
    return {
      source,
      target,
      resolvedUrl,
      status: null,
      finalUrl: null,
      responseTime,
      category: 'unreachable',
      error: isTimeout ? `Timeout after ${DEFAULT_TIMEOUT_MS}ms` : err.message,
    };
  }
};

const checkWithTimeout = async (source, target, baseUrl) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    return await checkUrl(source, target, baseUrl, controller.signal);
  } finally {
    clearTimeout(timer);
  }
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runChecks = async (rows, baseUrl, concurrency) => {
  const results = [];
  const total = rows.length;
  let completed = 0;

  for (let i = 0; i < rows.length; i += concurrency) {
    const batch = rows.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(({ source, target }) => checkWithTimeout(source, target, baseUrl)),
    );
    results.push(...batchResults);
    completed += batchResults.length;
    process.stdout.write(`\r  Progress: ${completed}/${total}`);
    if (i + concurrency < rows.length) await delay(BATCH_DELAY_MS);
  }

  process.stdout.write('\n');
  return results;
};

/**
 * Decides which rows need fresh HTTP checks and which can be carried over from a previous run.
 * A row is preserved only when it was a direct 200 (no server-side redirect) and its target
 * has not changed in the current CSV. Everything else is rechecked.
 *
 * @param {Array<{source: string, target: string}>} rows - current CSV rows
 * @param {Map<string, object>} previousResultsMap - source → result from previous JSON
 * @returns {{ preserved: object[], toCheck: Array<{source: string, target: string}> }}
 */
const buildCheckPlan = (rows, previousResultsMap) => {
  const preserved = [];
  const toCheck = [];

  for (const { source, target } of rows) {
    const prev = previousResultsMap.get(source);
    const isDirectOk = prev && prev.category === 'ok' && prev.finalUrl === null;
    const targetUnchanged = prev && prev.target === target;

    if (isDirectOk && targetUnchanged) {
      preserved.push(prev);
    } else {
      toCheck.push({ source, target });
    }
  }

  return { preserved, toCheck };
};

const checkRedirectTargets = async (inputPath, outputPath, options = {}) => {
  const baseUrl = options.baseUrl || DEFAULT_BASE_URL;
  const concurrency = options.concurrency || DEFAULT_CONCURRENCY;
  const previousPath = options.previousPath || null;

  const content = await fs.promises.readFile(inputPath, 'utf8');
  const rows = parseCsv(content);

  let previousResultsMap = new Map();
  if (previousPath) {
    const prevContent = await fs.promises.readFile(previousPath, 'utf8');
    const { results: prevResults } = JSON.parse(prevContent);
    previousResultsMap = new Map(prevResults.map((r) => [r.source, r]));
  }

  const { preserved, toCheck } = buildCheckPlan(rows, previousResultsMap);
  const isRefineMode = previousPath !== null;

  if (isRefineMode) {
    process.stdout.write(`Refine mode: ${rows.length} total — ${preserved.length} preserved, ${toCheck.length} to check\n`);
  } else {
    process.stdout.write(`Checking ${rows.length} redirect targets...\n`);
  }
  process.stdout.write(`  Base URL:    ${baseUrl}\n`);
  process.stdout.write(`  Concurrency: ${concurrency}\n\n`);

  const checkedAt = new Date().toISOString();
  const newResults = toCheck.length > 0
    ? await runChecks(toCheck, baseUrl, concurrency)
    : [];

  // Merge back in CSV order
  const resultsBySource = new Map([
    ...preserved.map((r) => [r.source, r]),
    ...newResults.map((r) => [r.source, r]),
  ]);
  const results = rows.map(({ source }) => resultsBySource.get(source)).filter(Boolean);

  const counts = { ok: 0, redirecting: 0, broken: 0, error: 0, unreachable: 0 };
  results.forEach((r) => counts[r.category]++);

  process.stdout.write(`\nSummary:\n`);
  process.stdout.write(`  OK (2xx):        ${counts.ok}\n`);
  process.stdout.write(`  Redirecting:     ${counts.redirecting}\n`);
  process.stdout.write(`  Broken (404):    ${counts.broken}\n`);
  process.stdout.write(`  Error (4xx/5xx): ${counts.error}\n`);
  process.stdout.write(`  Unreachable:     ${counts.unreachable}\n`);

  const meta = {
    inputFile: inputPath,
    baseUrl,
    checkedAt,
    concurrency,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    totalChecked: results.length,
    ...(isRefineMode && {
      previousResultsFile: previousPath,
      preserved: preserved.length,
      rechecked: newResults.length,
    }),
  };

  await fs.promises.writeFile(outputPath, JSON.stringify({ meta, results }, null, 2), 'utf8');
  process.stdout.write(`\nResults written to: ${outputPath}\n`);
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const baseUrlIdx = args.indexOf('--base-url');
  const concurrencyIdx = args.indexOf('--concurrency');
  const previousIdx = args.indexOf('--previous');

  const flagKeys = new Set();
  if (baseUrlIdx !== -1) { flagKeys.add(baseUrlIdx); flagKeys.add(baseUrlIdx + 1); }
  if (concurrencyIdx !== -1) { flagKeys.add(concurrencyIdx); flagKeys.add(concurrencyIdx + 1); }
  if (previousIdx !== -1) { flagKeys.add(previousIdx); flagKeys.add(previousIdx + 1); }

  const positional = args.filter((_, i) => !flagKeys.has(i) && !args[i].startsWith('--'));

  if (positional.length === 0) {
    process.stderr.write(
      'Usage: node check-redirect-targets.js <input.csv> [output.json] [--previous <results.json>] [--base-url <url>] [--concurrency <n>]\n',
    );
    process.exit(1);
  }

  const inputPath = path.resolve(positional[0]);
  const outputPath = positional[1]
    ? path.resolve(positional[1])
    : path.join(
        path.dirname(inputPath),
        `${path.basename(inputPath, path.extname(inputPath))}-results.json`,
      );
  const baseUrl = baseUrlIdx !== -1 ? args[baseUrlIdx + 1] : DEFAULT_BASE_URL;
  const concurrency =
    concurrencyIdx !== -1 ? parseInt(args[concurrencyIdx + 1], 10) : DEFAULT_CONCURRENCY;
  const previousPath = previousIdx !== -1 ? path.resolve(args[previousIdx + 1]) : null;

  checkRedirectTargets(inputPath, outputPath, { baseUrl, concurrency, previousPath })
    .then(() => process.exit(0))
    .catch((err) => {
      process.stderr.write(`Error: ${err.message}\n`);
      process.exit(1);
    });
}

module.exports = { checkRedirectTargets, checkUrl, categorizeStatus, resolveUrl, buildCheckPlan };
