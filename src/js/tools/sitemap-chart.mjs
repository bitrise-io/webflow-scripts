// Renders a "sitemap breakdown by section" bar chart as a PNG.
//
// Usage: node src/js/tools/sitemap-chart.mjs <sitemap.xml path or URL> <out.png> [--svg]
//
// Slack shows attachment images at max 400px wide, so the chart is drawn at 800x700 (2x, shown
// at 400x350): no resize beyond the 2x downscale, no crop, and text sized to stay legible.

import fs from 'node:fs';
import sharp from 'sharp';

const WIDTH = 800;
const HEIGHT = 700;
const MAX_ROWS = 11; // top sections shown; the rest are grouped into "Other"

const COLORS = {
  bg: '#ffffff',
  title: '#1f1f2e',
  muted: '#6b6b80',
  track: '#f1ecf7',
  bar: '#683d8b',
  barOther: '#b9a5cc',
};

async function readSitemap(source) {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`Failed to fetch ${source}: ${res.status}`);
    return res.text();
  }
  return fs.readFileSync(source, 'utf8');
}

export function extractUrls(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((m) => m[1]);
}

function sectionOf(url) {
  const { pathname } = new URL(url);
  return pathname.split('/').filter(Boolean)[0] || '';
}

function label(section) {
  if (!section) return 'Home';
  const text = section.replace(/-/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function breakdown(urls) {
  const counts = new Map();
  for (const url of urls) {
    const section = sectionOf(url);
    counts.set(section, (counts.get(section) || 0) + 1);
  }

  const sorted = [...counts.entries()]
    .map(([section, count]) => ({ name: label(section), count }))
    .sort((a, b) => b.count - a.count);

  if (sorted.length <= MAX_ROWS) return sorted.map((r) => ({ ...r, other: false }));

  const top = sorted.slice(0, MAX_ROWS - 1).map((r) => ({ ...r, other: false }));
  const rest = sorted.slice(MAX_ROWS - 1);
  const restCount = rest.reduce((sum, r) => sum + r.count, 0);
  top.push({ name: `Other (${rest.length})`, count: restCount, other: true });
  return top;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (n) => n.toLocaleString('en-US');

export function renderSvg(urls, date = new Date()) {
  const rows = breakdown(urls);
  const total = urls.length;
  const max = Math.max(...rows.map((r) => r.count));

  const padX = 32;
  const labelW = 210;
  const valueW = 150;
  const barX = padX + labelW;
  const barW = WIDTH - barX - padX - valueW;
  const top = 112;
  const rowH = (HEIGHT - top - 20) / rows.length;
  const barH = Math.min(30, rowH - 14);

  const font = 'font-family="Helvetica Neue, Helvetica, Arial, sans-serif"';
  const dateText = date.toISOString().slice(0, 10);

  const rowsSvg = rows
    .map((r, i) => {
      const cy = top + rowH * i + rowH / 2;
      const w = Math.max(6, Math.round((r.count / max) * barW));
      const pct = ((r.count / total) * 100).toFixed(r.count / total < 0.1 ? 1 : 0);
      return `
  <text x="${padX}" y="${cy + 9}" ${font} font-size="25" fill="${COLORS.title}">${esc(r.name)}</text>
  <rect x="${barX}" y="${cy - barH / 2}" width="${barW}" height="${barH}" rx="6" fill="${COLORS.track}"/>
  <rect x="${barX}" y="${cy - barH / 2}" width="${w}" height="${barH}" rx="6" fill="${r.other ? COLORS.barOther : COLORS.bar}"/>
  <text x="${WIDTH - padX - 72}" y="${cy + 9}" ${font} font-size="25" font-weight="700" fill="${COLORS.title}" text-anchor="end">${fmt(r.count)}</text>
  <text x="${WIDTH - padX}" y="${cy + 8}" ${font} font-size="21" fill="${COLORS.muted}" text-anchor="end">${pct}%</text>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${COLORS.bg}"/>
  <text x="${padX}" y="56" ${font} font-size="36" font-weight="700" fill="${COLORS.title}">bitrise.io sitemap</text>
  <text x="${WIDTH - padX}" y="56" ${font} font-size="36" font-weight="700" fill="${COLORS.bar}" text-anchor="end">${fmt(total)} URLs</text>
  <text x="${padX}" y="88" ${font} font-size="21" fill="${COLORS.muted}">By top-level section · ${dateText}</text>${rowsSvg}
</svg>`;
}

async function main() {
  const [source, out, flag] = process.argv.slice(2);
  if (!source || !out) {
    console.error('Usage: node sitemap-chart.js <sitemap.xml path|url> <out.png> [--svg]');
    process.exit(1);
  }
  const urls = extractUrls(await readSitemap(source));
  const svg = renderSvg(urls);
  if (flag === '--svg') fs.writeFileSync(out.replace(/\.png$/, '.svg'), svg);
  await sharp(Buffer.from(svg)).png().toFile(out);
  console.log(`Wrote ${out} (${urls.length} URLs)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
