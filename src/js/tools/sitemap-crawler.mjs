// A small, dependency-free site crawler that builds a sitemap.xml (and a CSV report) from the
// links found in the HTML source. No JS rendering, assets are never fetched, and the crawl never
// leaves the configured hosts.
//
// Usage: node src/js/tools/sitemap-crawler.mjs [--config file.json] [--url https://bitrise.io]
//          [--out sitemap.xml] [--report crawl.csv] [--concurrency 10] [--max-pages N]
//          [--max-depth N] [--max-seconds N] [--delay ms] [--include re]... [--exclude re]...
//          [--no-robots] [--allow-partial] [--quiet]
//
// Settings precedence: built-in DEFAULTS < --config file < command line flags.
//
// Exit codes: 0 ok, 1 fatal (e.g. start URL unreachable), 3 crawl was cut short (maxPages /
// maxSeconds) so the sitemap is incomplete. Outputs are still written in that case, but a CI step
// with `set -e` will stop before publishing them. Pass --allow-partial to accept it.

import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

export const DEFAULTS = {
  startUrl: 'https://bitrise.io',
  userAgent: 'BitriseSitemapCrawler/1.0',
  robotsAgent: 'BitriseSitemapCrawler',

  // How much / how far
  maxPages: 100000, // stop discovering after this many URLs
  maxDepth: 0, // clicks from the start URL, 0 = unlimited
  maxSeconds: 0, // wall-clock budget, 0 = unlimited
  maxUrlLength: 2000,
  maxQueryParams: 0, // skip URLs with more query params than this, 0 = no limit

  // How fast
  concurrency: 10,
  delayMs: 0, // minimum gap between request starts (global), 0 = none
  timeoutMs: 20000,
  retries: 2, // on network errors, 429 and 5xx
  maxRedirects: 10,
  maxBodyBytes: 5 * 1024 * 1024,

  // What to follow
  allowedHosts: [], // extra hosts that count as "inside", on top of the start URL's host
  include: [], // regexes on the full URL; when set, a URL must match one (start URL always passes)
  exclude: [], // regexes on the full URL; matching URLs are neither fetched nor reported
  rewrites: [], // [{ pattern, replace }] applied to every discovered URL before the scope check
  dropAllQueries: false, // ignore query strings entirely
  stripParams: ['utm_*', 'gclid', 'fbclid'], // params removed from every URL ('*' wildcard)
  seedSitemaps: [], // sitemap.xml URLs whose <loc> entries are crawled too (finds orphan pages)
  // JSON lists of pages the HTML can't reveal (e.g. client-side rendered): each entry is
  // { url, itemsPath?, template } where itemsPath is a dotted path to the array ('' = the root)
  // and template builds a URL from item fields, e.g. "https://bitrise.io/blog/post/{slug}".
  // Seeds are still fetched and checked like any other page, so 404s / noindex stay out.
  jsonSeeds: [],
  respectRobots: true,
  followNofollow: false, // follow rel="nofollow" links and links on meta-nofollow pages

  // What goes into the sitemap
  respectNoindex: true, // leave out noindex pages (meta robots / X-Robots-Tag)
  includeCanonicalised: false, // leave out pages whose canonical points elsewhere
};

// Never fetched, whatever the link looks like. Extensions that can also be real pages
// (e.g. /stacks/tools/node.js) are left out; the content-type check handles those.
const ASSET_EXT =
  /\.(?:jpe?g|png|gif|svg|webp|avif|ico|bmp|tiff?|css|pdf|zip|gz|tgz|tar|rar|7z|dmg|pkg|exe|apk|ipa|mp[34]|m4[av]|mov|avi|webm|ogg|wav|woff2?|ttf|otf|eot|docx?|xlsx?|pptx?)$/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const globToRegExp = (g) => new RegExp(`^${g.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 'i');

export function resolveConfig(overrides = {}) {
  const cfg = { ...DEFAULTS, ...overrides };
  cfg.excludeRe = cfg.exclude.map((p) => new RegExp(p));
  cfg.includeRe = cfg.include.map((p) => new RegExp(p));
  cfg.rewriteRules = cfg.rewrites.map((r) => ({ re: new RegExp(r.pattern, 'g'), replace: r.replace }));
  cfg.stripRe = cfg.stripParams.map(globToRegExp);
  return cfg;
}

/** Resolve, clean and rewrite a link. Returns an absolute http(s) URL string or null. */
export function normalizeUrl(raw, base, cfg) {
  let u;
  try {
    u = new URL(raw, base);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  u.hash = '';
  const clean = (url) => {
    if (cfg.dropAllQueries) url.search = '';
    else if (cfg.stripRe.length && url.search) {
      for (const key of [...url.searchParams.keys()]) {
        if (cfg.stripRe.some((re) => re.test(key))) url.searchParams.delete(key);
      }
    }
  };
  clean(u);
  let href = u.href;
  for (const { re, replace } of cfg.rewriteRules) href = href.replace(re, replace);
  if (href !== u.href) {
    try {
      u = new URL(href);
    } catch {
      return null;
    }
    clean(u);
  }
  return u.href;
}

// ---------------------------------------------------------------------------------------------
// HTML parsing (regex based, which is plenty for <a>, <link> and <meta> tags)
// ---------------------------------------------------------------------------------------------

const decodeEntities = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

function parseAttrs(tag) {
  const attrs = {};
  const re = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  re.lastIndex = tag.indexOf(' ');
  if (re.lastIndex < 0) return attrs;
  let m;
  while ((m = re.exec(tag))) {
    const name = m[1].toLowerCase();
    if (!(name in attrs)) attrs[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
}

/** Pull out what the crawler needs: links, canonical, base, robots directives. */
export function parseHtml(html, agentToken = DEFAULTS.robotsAgent) {
  const src = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');
  const out = { links: [], canonical: null, base: null, noindex: false, nofollow: false };

  for (const [tag] of src.matchAll(/<(?:a|link|meta|base)\b[^>]*>/gi)) {
    const a = parseAttrs(tag);
    if (/^<a[\s/]/i.test(tag)) {
      if (a.href) out.links.push({ href: a.href.trim(), nofollow: /\bnofollow\b/i.test(a.rel || '') });
    } else if (/^<link[\s/]/i.test(tag)) {
      if (/\bcanonical\b/i.test(a.rel || '') && a.href && !out.canonical) out.canonical = a.href.trim();
    } else if (/^<base[\s/]/i.test(tag)) {
      if (a.href && !out.base) out.base = a.href.trim();
    } else if (/^<meta[\s/]/i.test(tag)) {
      const n = (a.name || '').toLowerCase();
      if (n === 'robots' || n === agentToken.toLowerCase()) {
        const c = (a.content || '').toLowerCase();
        if (/\b(noindex|none)\b/.test(c)) out.noindex = true;
        if (/\b(nofollow|none)\b/.test(c)) out.nofollow = true;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// robots.txt
// ---------------------------------------------------------------------------------------------

/** Parse robots.txt into a matcher `(pathAndQuery) => allowed` for the given agent token. */
export function parseRobots(text, agent) {
  const token = agent.toLowerCase();
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const line of text.split(/\r?\n/)) {
    const m = line.replace(/#.*/, '').match(/^\s*([a-z-]+)\s*:\s*(.*?)\s*$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    if (key === 'user-agent') {
      if (!current || !lastWasAgent) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(m[2].toLowerCase());
      lastWasAgent = true;
    } else if ((key === 'allow' || key === 'disallow') && current) {
      lastWasAgent = false;
      if (m[2]) current.rules.push({ allow: key === 'allow', pattern: m[2] });
    } else lastWasAgent = false;
  }
  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && token.startsWith(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes('*'));
  const rules = chosen
    .flatMap((g) => g.rules)
    .map((r) => {
      const anchored = r.pattern.endsWith('$');
      const body = (anchored ? r.pattern.slice(0, -1) : r.pattern)
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*');
      return { allow: r.allow, length: r.pattern.length, re: new RegExp(`^${body}${anchored ? '$' : ''}`) };
    });
  return (target) => {
    let best = null;
    for (const r of rules) {
      if (!r.re.test(target)) continue;
      if (!best || r.length > best.length || (r.length === best.length && r.allow)) best = r;
    }
    return best ? best.allow : true;
  };
}

// ---------------------------------------------------------------------------------------------
// Crawl
// ---------------------------------------------------------------------------------------------

async function readText(res, max) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let out = '';
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    n += value.length;
    out += dec.decode(value, { stream: true });
    if (n > max) {
      await reader.cancel();
      break;
    }
  }
  return out + dec.decode();
}

/** A page belongs in the sitemap when it is an indexable, self-canonical 2xx HTML page. */
export function isSitemapEligible(rec, cfg) {
  if (rec.blocked || rec.error || !rec.html) return false;
  if (rec.status < 200 || rec.status >= 300) return false;
  if (cfg.respectNoindex && rec.noindex) return false;
  if (!cfg.includeCanonicalised && rec.canonical && rec.canonical !== rec.url) return false;
  return true;
}

export async function crawl(userConfig = {}, { log = () => {} } = {}) {
  const cfg = resolveConfig(userConfig);
  const startUrl = normalizeUrl(cfg.startUrl, undefined, cfg);
  if (!startUrl) throw new Error(`Invalid start URL: ${cfg.startUrl}`);
  const hosts = new Set([new URL(startUrl).host, ...cfg.allowedHosts.map((h) => h.toLowerCase())]);

  const records = new Map(); // url -> record
  const queue = [];
  let head = 0;
  let active = 0;
  let truncated = null;
  let externalLinks = 0;
  const t0 = Date.now();

  // robots.txt, once per in-scope host
  const robots = new Map();
  if (cfg.respectRobots) {
    for (const host of hosts) {
      try {
        const res = await fetch(`${new URL(startUrl).protocol}//${host}/robots.txt`, {
          headers: { 'user-agent': cfg.userAgent },
          signal: AbortSignal.timeout(cfg.timeoutMs),
        });
        robots.set(host, res.ok ? parseRobots(await res.text(), cfg.robotsAgent) : () => true);
      } catch (e) {
        log(`robots.txt for ${host} unavailable (${e.message}), allowing everything`);
      }
    }
  }

  let nextSlot = 0;
  async function pace() {
    if (!cfg.delayMs) return;
    const now = Date.now();
    const at = Math.max(now, nextSlot);
    nextSlot = at + cfg.delayMs;
    if (at > now) await sleep(at - now);
  }

  /** Register a discovered URL (and queue it) unless it is out of scope or filtered. */
  function consider(raw, base, depth, from, hops = 0) {
    const url = normalizeUrl(raw, base, cfg);
    if (!url) return;
    const known = records.get(url);
    if (known) {
      known.inlinks++;
      return;
    }
    const u = new URL(url);
    if (!hosts.has(u.host)) {
      externalLinks++;
      return;
    }
    if (cfg.maxDepth && depth > cfg.maxDepth) return;
    if (url.length > cfg.maxUrlLength || ASSET_EXT.test(u.pathname)) return;
    if (cfg.maxQueryParams && [...u.searchParams.keys()].length > cfg.maxQueryParams) return;
    if (cfg.excludeRe.some((re) => re.test(url))) return;
    if (cfg.includeRe.length && url !== startUrl && !cfg.includeRe.some((re) => re.test(url))) return;
    if (records.size >= cfg.maxPages) {
      truncated ??= 'maxPages';
      return;
    }
    const rec = { url, depth, hops, from, inlinks: 1, status: 0, html: false, noindex: false, nofollow: false };
    records.set(url, rec);
    const allowed = robots.get(u.host);
    if (allowed && !allowed(u.pathname + u.search)) rec.blocked = true;
    else queue.push(rec);
  }

  async function request(url) {
    for (let attempt = 0; ; attempt++) {
      await pace();
      const t = Date.now();
      try {
        const res = await fetch(url, {
          redirect: 'manual',
          headers: { 'user-agent': cfg.userAgent, accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1' },
          signal: AbortSignal.timeout(cfg.timeoutMs),
        });
        if ((res.status === 429 || res.status >= 500) && attempt < cfg.retries) {
          const wait = Math.min(Number(res.headers.get('retry-after')) * 1000 || 1000 * 2 ** attempt, 30000);
          await res.body?.cancel();
          await sleep(wait);
          continue;
        }
        return { res, ms: Date.now() - t };
      } catch (e) {
        if (attempt < cfg.retries) {
          await sleep(500 * 2 ** attempt);
          continue;
        }
        const error = e.name === 'TimeoutError' ? 'timeout' : (e.cause?.code ?? e.message);
        return { error, ms: Date.now() - t };
      }
    }
  }

  async function visit(rec) {
    const { res, ms, error } = await request(rec.url);
    rec.ms = ms;
    if (error) {
      rec.error = error;
      return;
    }
    rec.status = res.status;
    rec.contentType = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const xRobots = (res.headers.get('x-robots-tag') || '').toLowerCase();
    if (/\b(noindex|none)\b/.test(xRobots)) rec.noindex = true;
    if (/\b(nofollow|none)\b/.test(xRobots)) rec.nofollow = true;

    if (res.status >= 300 && res.status < 400) {
      await res.body?.cancel();
      const location = res.headers.get('location');
      if (!location) return;
      rec.redirectTo = normalizeUrl(location, rec.url, cfg);
      if (rec.hops >= cfg.maxRedirects) rec.error = 'too many redirects';
      else if (rec.redirectTo) consider(rec.redirectTo, undefined, rec.depth, rec.url, rec.hops + 1);
      return;
    }
    if (res.status < 200 || res.status >= 300 || !/html/.test(rec.contentType)) {
      await res.body?.cancel();
      return;
    }

    rec.html = true;
    const page = parseHtml(await readText(res, cfg.maxBodyBytes), cfg.robotsAgent);
    rec.noindex ||= page.noindex;
    rec.nofollow ||= page.nofollow;
    if (page.canonical) {
      rec.canonical = normalizeUrl(page.canonical, rec.url, cfg);
      // The canonical target may not be linked anywhere in the HTML, so discover it from here
      if (rec.canonical && rec.canonical !== rec.url) consider(rec.canonical, undefined, rec.depth + 1, rec.url);
    }
    if (rec.nofollow && !cfg.followNofollow) return;
    const base = page.base ? new URL(page.base, rec.url).href : rec.url;
    for (const link of page.links) {
      if (link.nofollow && !cfg.followNofollow) continue;
      consider(link.href, base, rec.depth + 1, rec.url);
    }
  }

  async function worker() {
    for (;;) {
      if (cfg.maxSeconds && Date.now() - t0 > cfg.maxSeconds * 1000) {
        truncated ??= 'maxSeconds';
        return;
      }
      const rec = queue[head];
      if (!rec) {
        if (active === 0) return;
        await sleep(20);
        continue;
      }
      queue[head++] = undefined; // let it be collected
      active++;
      try {
        await visit(rec);
      } catch (e) {
        rec.error = e.message;
      } finally {
        active--;
      }
    }
  }

  async function fetchSeed(url, parse) {
    const res = await fetch(url, { headers: { 'user-agent': cfg.userAgent }, signal: AbortSignal.timeout(cfg.timeoutMs) });
    // A seed that silently yields nothing would quietly drop pages from the sitemap, so fail loudly
    if (!res.ok) throw new Error(`Seed ${url} returned ${res.status}`);
    return parse(res);
  }

  consider(startUrl, undefined, 0, null);
  for (const sitemapUrl of cfg.seedSitemaps) {
    const xml = await fetchSeed(sitemapUrl, (r) => r.text());
    for (const [, loc] of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) consider(decodeEntities(loc), undefined, 1, sitemapUrl);
  }
  for (const seed of cfg.jsonSeeds) {
    const data = await fetchSeed(seed.url, (r) => r.json());
    const items = (seed.itemsPath || '').split('.').filter(Boolean).reduce((o, k) => o?.[k], data);
    if (!Array.isArray(items)) throw new Error(`Seed ${seed.url}: no array at "${seed.itemsPath || ''}"`);
    for (const item of items) {
      let complete = true;
      const url = seed.template.replace(/\{(\w+)\}/g, (_, key) => {
        if (item?.[key] == null || item[key] === '') complete = false;
        return encodeURIComponent(item?.[key] ?? '');
      });
      if (!complete) continue;
      consider(url, undefined, 1, seed.url);
    }
    log(`seed ${seed.url}: ${items.length} items`);
  }

  const ticker = setInterval(() => {
    const done = head;
    const secs = (Date.now() - t0) / 1000;
    log(`${done} crawled, ${records.size} discovered, ${queue.length - head} queued, ${(done / secs).toFixed(1)} pages/s, ${Math.round(secs)}s`);
  }, 5000);
  try {
    await Promise.all(Array.from({ length: cfg.concurrency }, worker));
  } finally {
    clearInterval(ticker);
  }

  const all = [...records.values()];
  const start = records.get(startUrl);
  return {
    config: cfg,
    records: all,
    truncated,
    externalLinks,
    seconds: (Date.now() - t0) / 1000,
    startOk: Boolean(start) && !start.error && start.status >= 200 && start.status < 400,
    sitemapUrls: all.filter((r) => isSitemapEligible(r, cfg)).map((r) => r.url).sort(),
  };
}

// ---------------------------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------------------------

const xmlEscape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function buildSitemapXml(urls) {
  const body = urls.map((u) => `  <url>\n    <loc>${xmlEscape(u)}</loc>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function buildCsv(result) {
  const inSitemap = new Set(result.sitemapUrls);
  const header = ['url', 'status', 'depth', 'content_type', 'noindex', 'canonical', 'redirect_to', 'in_sitemap', 'inlinks', 'first_linked_from', 'response_ms'];
  const rows = result.records.map((r) =>
    [r.url, r.blocked ? 'blocked-by-robots' : r.error || r.status, r.depth, r.contentType, r.noindex, r.canonical, r.redirectTo, inSitemap.has(r.url), r.inlinks, r.from, r.ms]
      .map(csvCell)
      .join(','),
  );
  return `${[header.join(','), ...rows].join('\n')}\n`;
}

export function summarize(result) {
  const by = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, errors: 0, blocked: 0 };
  for (const r of result.records) {
    if (r.blocked) by.blocked++;
    else if (r.error) by.errors++;
    else by[`${Math.floor(r.status / 100)}xx`] = (by[`${Math.floor(r.status / 100)}xx`] || 0) + 1;
  }
  const broken = result.records.filter((r) => !r.blocked && (r.error || r.status >= 400));
  const lines = [
    `Crawled ${result.records.length} URLs in ${result.seconds.toFixed(1)}s (${(result.records.length / result.seconds).toFixed(1)}/s)`,
    `  2xx ${by['2xx']} · 3xx ${by['3xx']} · 4xx ${by['4xx']} · 5xx ${by['5xx']} · errors ${by.errors} · blocked by robots ${by.blocked}`,
    `  external links skipped: ${result.externalLinks}`,
    `  in sitemap: ${result.sitemapUrls.length}`,
  ];
  if (result.sitemapUrls.length > 50000) lines.push('  WARNING: more than 50,000 URLs, the sitemap needs splitting into an index');
  if (broken.length) {
    lines.push(`  broken (${broken.length}), first ${Math.min(broken.length, 20)}:`);
    for (const r of broken.slice(0, 20)) lines.push(`    ${r.error || r.status}  ${r.url}  <- ${r.from}`);
  }
  if (result.truncated) lines.push(`  WARNING: crawl cut short (${result.truncated}), results are incomplete`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

async function main() {
  const { values } = parseArgs({
    options: {
      config: { type: 'string', short: 'c' },
      url: { type: 'string' },
      out: { type: 'string', short: 'o', default: 'sitemap.xml' },
      report: { type: 'string' },
      concurrency: { type: 'string' },
      delay: { type: 'string' },
      'max-pages': { type: 'string' },
      'max-depth': { type: 'string' },
      'max-seconds': { type: 'string' },
      include: { type: 'string', multiple: true },
      exclude: { type: 'string', multiple: true },
      'no-robots': { type: 'boolean' },
      'allow-partial': { type: 'boolean' },
      quiet: { type: 'boolean', short: 'q' },
      help: { type: 'boolean', short: 'h' },
    },
  });
  if (values.help) {
    console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n'));
    return 0;
  }

  const fileCfg = values.config ? JSON.parse(fs.readFileSync(values.config, 'utf8')) : {};
  const num = (v) => (v === undefined ? undefined : Number(v));
  const cli = {
    startUrl: values.url,
    concurrency: num(values.concurrency),
    delayMs: num(values.delay),
    maxPages: num(values['max-pages']),
    maxDepth: num(values['max-depth']),
    maxSeconds: num(values['max-seconds']),
    include: values.include,
    exclude: values.exclude && [...(fileCfg.exclude || []), ...values.exclude],
    respectRobots: values['no-robots'] ? false : undefined,
  };
  const overrides = { ...fileCfg, ...Object.fromEntries(Object.entries(cli).filter(([, v]) => v !== undefined)) };

  const log = values.quiet ? () => {} : (m) => console.error(m);
  log(`Crawling ${overrides.startUrl || DEFAULTS.startUrl} as ${overrides.userAgent || DEFAULTS.userAgent}`);
  const result = await crawl(overrides, { log });

  fs.writeFileSync(values.out, buildSitemapXml(result.sitemapUrls));
  if (values.report) fs.writeFileSync(values.report, buildCsv(result));
  console.log(summarize(result));
  console.log(`Wrote ${values.out}${values.report ? ` and ${values.report}` : ''}`);

  if (!result.startOk) {
    console.error('Start URL did not return a usable response, refusing to treat this crawl as valid');
    return 1;
  }
  return result.truncated && !values['allow-partial'] ? 3 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => process.exit(code),
    (e) => {
      console.error(e);
      process.exit(1);
    },
  );
}
