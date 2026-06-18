const fs = require('fs');
const path = require('path');

const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * @param {Array} results
 * @param {{ inputFile: string, baseUrl: string, checkedAt: string }} meta
 * @returns {string}
 */
const generateHtmlReport = (results, meta) => {
  const { inputFile, baseUrl, checkedAt } = meta;
  const counts = { ok: 0, redirecting: 0, broken: 0, error: 0, unreachable: 0 };
  results.forEach((r) => counts[r.category]++);
  const total = results.length;
  const ts = checkedAt.replace('T', ' ').slice(0, 19) + ' UTC';

  const rowsHtml = results
    .map(
      (r) => `
    <tr class="${escapeHtml(r.category)}">
      <td><code>${escapeHtml(r.source)}</code></td>
      <td><a href="${escapeHtml(r.resolvedUrl)}" target="_blank" rel="noopener">${escapeHtml(r.target)}</a></td>
      <td>${r.status !== null ? r.status : '—'}</td>
      <td>${r.finalUrl ? `<a href="${escapeHtml(r.finalUrl)}" target="_blank" rel="noopener" title="${escapeHtml(r.finalUrl)}">${escapeHtml(r.finalUrl.replace(baseUrl, ''))}</a>` : '—'}</td>
      <td>${r.status !== null ? r.responseTime : '—'}</td>
      <td><span class="badge ${escapeHtml(r.category)}">${escapeHtml(r.category)}</span>${r.error ? ` <small title="${escapeHtml(r.error)}">ⓘ</small>` : ''}</td>
    </tr>`,
    )
    .join('');

  const jsonData = JSON.stringify(
    results.map((r) => ({
      source: r.source,
      target: r.target,
      resolvedUrl: r.resolvedUrl,
      status: r.status,
      finalUrl: r.finalUrl,
      responseTime: r.responseTime,
      category: r.category,
      error: r.error,
    })),
  ).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirect Target Check Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 14px; color: #1a1a1a; background: #f5f5f5; padding: 24px; }
    h1 { font-size: 22px; font-weight: 600; margin-bottom: 6px; }
    .meta { color: #666; margin-bottom: 20px; font-size: 13px; }
    .meta code { background: #e8e8e8; padding: 1px 5px; border-radius: 3px; }
    .summary { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
    .stat { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px 18px; min-width: 110px; text-align: center; }
    .stat .label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: #888; margin-bottom: 4px; }
    .stat .value { font-size: 24px; font-weight: 700; }
    .stat.ok .value { color: #1a7f37; }
    .stat.redirecting .value { color: #9a6700; }
    .stat.broken .value { color: #cf222e; }
    .stat.error .value { color: #bc4c00; }
    .stat.unreachable .value { color: #57606a; }
    .controls { display: flex; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; }
    .controls input, .controls select { border: 1px solid #ccc; border-radius: 6px; padding: 6px 10px; font-size: 13px; background: #fff; }
    .controls input { min-width: 260px; }
    .controls .count { color: #666; font-size: 13px; margin-left: 4px; }
    .table-wrap { overflow-x: auto; background: #fff; border: 1px solid #ddd; border-radius: 8px; }
    table { border-collapse: collapse; width: 100%; min-width: 820px; }
    thead th { position: sticky; top: 0; background: #f0f0f0; padding: 9px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; cursor: pointer; user-select: none; white-space: nowrap; border-bottom: 1px solid #ddd; }
    thead th:hover { background: #e4e4e4; }
    thead th .sort-arrow { margin-left: 4px; opacity: .4; }
    thead th.sorted .sort-arrow { opacity: 1; }
    tbody tr { border-bottom: 1px solid #eee; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: #fafafa; }
    tbody td { padding: 7px 12px; vertical-align: middle; font-size: 13px; }
    tbody td code { font-size: 12px; background: #f0f0f0; padding: 1px 4px; border-radius: 3px; }
    tbody td a { color: #0969da; text-decoration: none; word-break: break-all; }
    tbody td a:hover { text-decoration: underline; }
    tbody tr.ok td:first-child { border-left: 3px solid #1a7f37; }
    tbody tr.redirecting td:first-child { border-left: 3px solid #d4a017; }
    tbody tr.broken td:first-child { border-left: 3px solid #cf222e; }
    tbody tr.error td:first-child { border-left: 3px solid #bc4c00; }
    tbody tr.unreachable td:first-child { border-left: 3px solid #8c8c8c; }
    .badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 10px; text-transform: uppercase; letter-spacing: .04em; }
    .badge.ok { background: #dafbe1; color: #1a7f37; }
    .badge.redirecting { background: #fff8c5; color: #9a6700; }
    .badge.broken { background: #ffebe9; color: #cf222e; }
    .badge.error { background: #ffd8b2; color: #bc4c00; }
    .badge.unreachable { background: #eee; color: #57606a; }
    .empty { padding: 32px; text-align: center; color: #888; }
  </style>
</head>
<body>
  <h1>Redirect Target Check Report</h1>
  <p class="meta">Checked: <code>${escapeHtml(inputFile)}</code> &nbsp;·&nbsp; ${ts} &nbsp;·&nbsp; Base URL: <code>${escapeHtml(baseUrl)}</code></p>

  <div class="summary">
    <div class="stat"><div class="label">Total</div><div class="value">${total}</div></div>
    <div class="stat ok"><div class="label">OK</div><div class="value">${counts.ok}</div></div>
    <div class="stat redirecting"><div class="label">Redirecting</div><div class="value">${counts.redirecting}</div></div>
    <div class="stat broken"><div class="label">Broken</div><div class="value">${counts.broken}</div></div>
    <div class="stat error"><div class="label">Error</div><div class="value">${counts.error}</div></div>
    <div class="stat unreachable"><div class="label">Unreachable</div><div class="value">${counts.unreachable}</div></div>
  </div>

  <div class="controls">
    <input id="filter-text" type="search" placeholder="Filter by source or URL…" oninput="applyFilters()">
    <select id="filter-status" onchange="applyFilters()">
      <option value="">All statuses</option>
      <option value="ok">OK</option>
      <option value="redirecting">Redirecting</option>
      <option value="broken">Broken</option>
      <option value="error">Error</option>
      <option value="unreachable">Unreachable</option>
    </select>
    <span class="count" id="visible-count"></span>
  </div>

  <div class="table-wrap">
    <table id="results-table">
      <thead>
        <tr>
          <th onclick="sortBy('source')" data-key="source">Source Path <span class="sort-arrow">↕</span></th>
          <th onclick="sortBy('target')" data-key="target">Target URL <span class="sort-arrow">↕</span></th>
          <th onclick="sortBy('status')" data-key="status">Status <span class="sort-arrow">↕</span></th>
          <th onclick="sortBy('finalUrl')" data-key="finalUrl">Final URL <span class="sort-arrow">↕</span></th>
          <th onclick="sortBy('responseTime')" data-key="responseTime">Time (ms) <span class="sort-arrow">↕</span></th>
          <th onclick="sortBy('category')" data-key="category">Category <span class="sort-arrow">↕</span></th>
        </tr>
      </thead>
      <tbody id="results-body">
        ${rowsHtml}
      </tbody>
    </table>
  </div>

  <script id="report-data" type="application/json">${jsonData}</script>
  <script>
    const RAW = JSON.parse(document.getElementById('report-data').textContent);
    const tbody = document.getElementById('results-body');
    const countEl = document.getElementById('visible-count');
    let sortKey = null, sortAsc = true;

    function escHtml(s) {
      return String(s == null ? '' : s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    function renderTable(data) {
      if (!data.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty">No results match the current filter.</td></tr>';
        countEl.textContent = '0 results';
        return;
      }
      const baseUrl = ${JSON.stringify(baseUrl)};
      tbody.innerHTML = data.map(r => {
        const finalCell = r.finalUrl
          ? '<a href="' + escHtml(r.finalUrl) + '" target="_blank" rel="noopener" title="' + escHtml(r.finalUrl) + '">' + escHtml(r.finalUrl.replace(baseUrl,'')) + '</a>'
          : '—';
        const errIcon = r.error ? ' <small title="' + escHtml(r.error) + '">ⓘ</small>' : '';
        return '<tr class="' + escHtml(r.category) + '">'
          + '<td><code>' + escHtml(r.source) + '</code></td>'
          + '<td><a href="' + escHtml(r.resolvedUrl) + '" target="_blank" rel="noopener">' + escHtml(r.target) + '</a></td>'
          + '<td>' + (r.status !== null ? r.status : '—') + '</td>'
          + '<td>' + finalCell + '</td>'
          + '<td>' + (r.status !== null ? r.responseTime : '—') + '</td>'
          + '<td><span class="badge ' + escHtml(r.category) + '">' + escHtml(r.category) + '</span>' + errIcon + '</td>'
          + '</tr>';
      }).join('');
      countEl.textContent = data.length + ' of ${total} results';
    }

    function applyFilters() {
      const text = document.getElementById('filter-text').value.toLowerCase();
      const status = document.getElementById('filter-status').value;
      let data = RAW.filter(r => {
        if (status && r.category !== status) return false;
        if (text && !r.source.toLowerCase().includes(text) && !r.resolvedUrl.toLowerCase().includes(text)) return false;
        return true;
      });
      if (sortKey) {
        data = [...data].sort((a, b) => {
          const av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
          if (av < bv) return sortAsc ? -1 : 1;
          if (av > bv) return sortAsc ? 1 : -1;
          return 0;
        });
      }
      renderTable(data);
    }

    function sortBy(key) {
      if (sortKey === key) { sortAsc = !sortAsc; } else { sortKey = key; sortAsc = true; }
      document.querySelectorAll('thead th').forEach(th => {
        th.classList.toggle('sorted', th.dataset.key === key);
        if (th.dataset.key === key) {
          th.querySelector('.sort-arrow').textContent = sortAsc ? '↑' : '↓';
        } else {
          th.querySelector('.sort-arrow').textContent = '↕';
        }
      });
      applyFilters();
    }

    applyFilters();
  </script>
</body>
</html>`;
};

const generateReport = async (inputPath, outputPath) => {
  const content = await fs.promises.readFile(inputPath, 'utf8');
  const { meta, results } = JSON.parse(content);

  const html = generateHtmlReport(results, meta);
  await fs.promises.writeFile(outputPath, html, 'utf8');
  process.stdout.write(`Report written to: ${outputPath}\n`);
};

if (require.main === module) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));

  if (args.length === 0) {
    process.stderr.write('Usage: node generate-redirect-report.js <results.json> [output.html]\n');
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  const outputPath = args[1]
    ? path.resolve(args[1])
    : path.join(
        path.dirname(inputPath),
        `${path.basename(inputPath, path.extname(inputPath))}-report.html`,
      );

  generateReport(inputPath, outputPath)
    .then(() => process.exit(0))
    .catch((err) => {
      process.stderr.write(`Error: ${err.message}\n`);
      process.exit(1);
    });
}

module.exports = { generateReport, generateHtmlReport };
