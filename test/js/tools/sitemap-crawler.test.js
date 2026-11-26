import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import {
  resolveConfig,
  normalizeUrl,
  parseHtml,
  parseRobots,
  crawl,
  buildSitemapXml,
} from '../../../src/js/tools/sitemap-crawler.mjs';

describe('normalizeUrl', () => {
  const cfg = resolveConfig({
    rewrites: [{ pattern: '^https?://www\\.example\\.com/', replace: 'https://example.com/' }],
  });

  it('resolves relative links and drops fragments', () => {
    expect(normalizeUrl('../b#top', 'https://example.com/a/c', cfg)).toBe('https://example.com/b');
  });
  it('rejects non-http protocols', () => {
    expect(normalizeUrl('mailto:a@b.c', undefined, cfg)).toBeNull();
    expect(normalizeUrl('javascript:void(0)', 'https://example.com/', cfg)).toBeNull();
  });
  it('strips tracking params but keeps others', () => {
    expect(normalizeUrl('/p?utm_source=x&page=2', 'https://example.com/', cfg)).toBe('https://example.com/p?page=2');
  });
  it('applies rewrite rules', () => {
    expect(normalizeUrl('https://www.example.com/x', undefined, cfg)).toBe('https://example.com/x');
  });
  it('can drop all queries', () => {
    const c = resolveConfig({ dropAllQueries: true });
    expect(normalizeUrl('/p?a=1', 'https://example.com/', c)).toBe('https://example.com/p');
  });
});

describe('parseHtml', () => {
  it('finds links regardless of attribute order and quoting, ignoring scripts and comments', () => {
    const page = parseHtml(`
      <a class="x" href="/one">1</a><a href='/two' rel="nofollow noopener">2</a><a href=/three>3</a>
      <!-- <a href="/commented">no</a> -->
      <script>var s = '<a href="/in-script">';</script>
      <a href="/q?a=1&amp;b=2">4</a><a name="anchor-only">5</a>`);
    expect(page.links).toEqual([
      { href: '/one', nofollow: false },
      { href: '/two', nofollow: true },
      { href: '/three', nofollow: false },
      { href: '/q?a=1&b=2', nofollow: false },
    ]);
  });
  it('reads canonical, base and robots meta', () => {
    const page = parseHtml(
      '<base href="/docs/"><link rel="canonical" href="https://e.com/c"><meta name="robots" content="noindex, nofollow">',
    );
    expect(page).toMatchObject({ canonical: 'https://e.com/c', base: '/docs/', noindex: true, nofollow: true });
  });
  it('does not treat other <a…> tags (abbr, address) as links', () => {
    expect(parseHtml('<abbr href="/x">a</abbr><address>b</address>').links).toEqual([]);
  });
});

describe('parseRobots', () => {
  const txt = `
    User-agent: *
    Disallow: /private
    Allow: /private/ok
    Disallow: /*.pdf$

    User-agent: BitriseSitemapCrawler
    Disallow: /only-us
  `;
  it('uses the group for our agent when present', () => {
    const allowed = parseRobots(txt, 'BitriseSitemapCrawler');
    expect(allowed('/only-us/x')).toBe(false);
    expect(allowed('/private')).toBe(true);
  });
  it('falls back to * with longest-match and wildcard support', () => {
    const allowed = parseRobots(txt, 'SomeoneElse');
    expect(allowed('/private/data')).toBe(false);
    expect(allowed('/private/ok/1')).toBe(true);
    expect(allowed('/a/b.pdf')).toBe(false);
    expect(allowed('/a/b.pdf?x=1')).toBe(true);
  });
});

describe('crawl (local fake site)', () => {
  let server;
  let origin;
  const hits = [];
  const html = (body, head = '') => `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

  const routes = {
    '/': () => html(`
      <a href="/about">about</a> <a href="/blog/">blog</a> <a href="/old">old</a>
      <a href="/hidden-noindex">n</a> <a href="/canon-b">c</a> <a href="/private/x">p</a>
      <a href="/logo.png">img</a> <a href="/app.js">js</a> <a href="/style.css">css</a> <a href="/file.pdf">pdf</a>
      <a href="https://other.example.org/page">external</a> <a href="/missing">missing</a>
      <a href="/nofollow-me" rel="nofollow">nf</a> <a href="/about#section">dup</a>
      <a href="/excluded/page">ex</a> <a href="/about?utm_source=news">tracked</a>`),
    '/about': () => html('<a href="/deep1">deep</a>'),
    '/deep1': () => html('<a href="/deep2">deeper</a>'),
    '/deep2': () => html('end'),
    '/blog/': () => html('<a href="/blog/post-1">1</a>'),
    '/blog/post-1': () => html('post'),
    '/hidden-noindex': () => html('<a href="/via-noindex">still followed</a>', '<meta name="robots" content="noindex">'),
    '/via-noindex': () => html('found through a noindex page'),
    '/canon-b': () => html('b', '<link rel="canonical" href="/about">'),
    '/private/x': () => html('should never be fetched'),
    '/nofollow-me': () => html('nf'),
    '/excluded/page': () => html('ex'),
  };

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      hits.push({ url: req.url, ua: req.headers['user-agent'] });
      const path = req.url.split('?')[0];
      if (path === '/robots.txt') return res.end('User-agent: *\nDisallow: /private\n');
      if (path === '/old') {
        res.writeHead(301, { location: '/about' });
        return res.end();
      }
      if (routes[path]) {
        res.writeHead(200, { 'content-type': 'text/html' });
        return res.end(routes[path]());
      }
      res.writeHead(404, { 'content-type': 'text/html' });
      res.end('nope');
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(() => new Promise((r) => server.close(r)));

  const run = (extra = {}) => {
    hits.length = 0;
    return crawl({ startUrl: `${origin}/`, concurrency: 3, exclude: ['/excluded/'], ...extra });
  };
  const paths = (urls) => urls.map((u) => new URL(u).pathname);

  it('builds a sitemap of indexable, self-canonical, in-scope HTML pages', async () => {
    const result = await run();
    expect(paths(result.sitemapUrls)).toEqual([
      '/',
      '/about',
      '/blog/',
      '/blog/post-1',
      '/deep1',
      '/deep2',
      '/via-noindex',
    ]);
    expect(result.startOk).toBe(true);
    expect(result.truncated).toBeNull();
  });

  it('identifies itself and never fetches assets, external, excluded, robots-blocked or nofollow URLs', async () => {
    await run();
    expect(new Set(hits.map((h) => h.ua))).toEqual(new Set(['BitriseSitemapCrawler/1.0']));
    const fetched = hits.map((h) => h.url.split('?')[0]);
    for (const bad of ['/logo.png', '/style.css', '/file.pdf', '/private/x', '/nofollow-me', '/excluded/page']) {
      expect(fetched).not.toContain(bad);
    }
    expect(fetched.filter((p) => p === '/about').length).toBe(1); // #fragment and utm_ variants deduped
  });

  it('records redirects, 404s with their source page, and robots blocks', async () => {
    const result = await run();
    const byPath = Object.fromEntries(result.records.map((r) => [new URL(r.url).pathname, r]));
    expect(byPath['/old']).toMatchObject({ status: 301, redirectTo: `${origin}/about` });
    expect(byPath['/missing']).toMatchObject({ status: 404, from: `${origin}/` });
    expect(byPath['/private/x'].blocked).toBe(true);
    expect(byPath['/canon-b'].canonical).toBe(`${origin}/about`);
    expect(result.externalLinks).toBeGreaterThan(0);
  });

  it('honours maxDepth', async () => {
    const result = await run({ maxDepth: 1 });
    expect(paths(result.sitemapUrls)).not.toContain('/deep1');
    expect(paths(result.sitemapUrls)).toContain('/about');
  });

  it('flags a truncated crawl when maxPages is hit', async () => {
    const result = await run({ maxPages: 3 });
    expect(result.records.length).toBe(3);
    expect(result.truncated).toBe('maxPages');
  });

  it('can follow nofollow links and ignore robots when asked', async () => {
    const result = await run({ followNofollow: true, respectRobots: false });
    expect(paths(result.sitemapUrls)).toContain('/nofollow-me');
    expect(paths(result.sitemapUrls)).toContain('/private/x');
  });
});

describe('buildSitemapXml', () => {
  it('escapes URLs', () => {
    expect(buildSitemapXml(['https://e.com/?a=1&b=2'])).toContain('<loc>https://e.com/?a=1&amp;b=2</loc>');
  });
});

describe('asset filtering', () => {
  it('still crawls page URLs that end in .js', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(req.url === '/' ? '<a href="/tools/node.js">n</a><a href="/pic.png">p</a>' : 'ok');
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    const result = await crawl({ startUrl: `http://127.0.0.1:${server.address().port}/` });
    await new Promise((r) => server.close(r));
    expect(result.sitemapUrls.map((u) => new URL(u).pathname)).toEqual(['/', '/tools/node.js']);
  });
});

describe('jsonSeeds', () => {
  let server;
  let origin;
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const path = req.url.split('?')[0];
      if (path === '/list.json') {
        res.writeHead(200, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ data: { posts: [{ slug: 'a' }, { slug: 'draft' }, { slug: '' }, { slug: 'hidden' }] } }));
      }
      if (path === '/broken.json') {
        res.writeHead(500);
        return res.end();
      }
      if (path === '/post/draft') {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(path === '/post/hidden' ? '<meta name="robots" content="noindex">' : 'ok');
    });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    origin = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(() => new Promise((r) => server.close(r)));

  it('adds pages the HTML does not link to, but only if they verify as indexable', async () => {
    const result = await crawl({
      startUrl: `${origin}/`,
      jsonSeeds: [{ url: `${origin}/list.json`, itemsPath: 'data.posts', template: `${origin}/post/{slug}` }],
    });
    expect(result.sitemapUrls.map((u) => new URL(u).pathname)).toEqual(['/', '/post/a']);
  });

  it('fails loudly when a seed cannot be read', async () => {
    await expect(
      crawl({ startUrl: `${origin}/`, jsonSeeds: [{ url: `${origin}/broken.json`, template: `${origin}/{slug}` }] }),
    ).rejects.toThrow(/500/);
  });
});
