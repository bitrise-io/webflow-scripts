import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { checkUrl, categorizeStatus, resolveUrl, buildCheckPlan } = require('../../../src/js/tools/check-redirect-targets');

describe('categorizeStatus', () => {
  it('returns "ok" for 200', () => expect(categorizeStatus(200)).toBe('ok'));
  it('returns "ok" for 201', () => expect(categorizeStatus(201)).toBe('ok'));
  it('returns "redirecting" for 301', () => expect(categorizeStatus(301)).toBe('redirecting'));
  it('returns "redirecting" for 302', () => expect(categorizeStatus(302)).toBe('redirecting'));
  it('returns "redirecting" for 308', () => expect(categorizeStatus(308)).toBe('redirecting'));
  it('returns "broken" for 404', () => expect(categorizeStatus(404)).toBe('broken'));
  it('returns "error" for 500', () => expect(categorizeStatus(500)).toBe('error'));
  it('returns "error" for 403', () => expect(categorizeStatus(403)).toBe('error'));
  it('returns "unreachable" for null', () => expect(categorizeStatus(null)).toBe('unreachable'));
});

describe('resolveUrl', () => {
  it('prepends base URL to relative path', () =>
    expect(resolveUrl('/foo', 'https://bitrise.io')).toBe('https://bitrise.io/foo'));
  it('leaves absolute URLs unchanged', () =>
    expect(resolveUrl('https://app.bitrise.io/cli', 'https://bitrise.io')).toBe('https://app.bitrise.io/cli'));
  it('handles root path', () =>
    expect(resolveUrl('/', 'https://bitrise.io')).toBe('https://bitrise.io/'));
  it('uses provided baseUrl', () =>
    expect(resolveUrl('/page', 'https://example.com')).toBe('https://example.com/page'));
  it('strips trailing slash from base before joining', () =>
    expect(resolveUrl('/page', 'https://bitrise.io/')).toBe('https://bitrise.io/page'));
});

describe('checkUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns ok for a direct 200 with no redirect', async () => {
    fetch.mockResolvedValue({ status: 200, url: 'https://bitrise.io/customer-stories', ok: true });
    const result = await checkUrl('/source', '/customer-stories', 'https://bitrise.io', new AbortController().signal);
    expect(result.status).toBe(200);
    expect(result.category).toBe('ok');
    expect(result.finalUrl).toBeNull();
    expect(result.error).toBeNull();
    expect(result.responseTime).toBeGreaterThanOrEqual(0);
  });

  it('sets finalUrl and category "redirecting" when a 200 was reached via redirect', async () => {
    fetch.mockResolvedValue({ status: 200, url: 'https://bitrise.io/new-page', ok: true });
    const result = await checkUrl('/source', '/old-page', 'https://bitrise.io', new AbortController().signal);
    expect(result.finalUrl).toBe('https://bitrise.io/new-page');
    expect(result.category).toBe('redirecting');
  });

  it('falls back to GET when HEAD returns 405', async () => {
    fetch
      .mockResolvedValueOnce({ status: 405, url: 'https://bitrise.io/page', ok: false })
      .mockResolvedValueOnce({ status: 200, url: 'https://bitrise.io/page', ok: true });
    const result = await checkUrl('/source', '/page', 'https://bitrise.io', new AbortController().signal);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'GET' });
    expect(result.status).toBe(200);
  });

  it('falls back to GET when HEAD throws a non-abort error', async () => {
    fetch
      .mockRejectedValueOnce(new Error('Connection refused'))
      .mockResolvedValueOnce({ status: 200, url: 'https://bitrise.io/page', ok: true });
    const result = await checkUrl('/source', '/page', 'https://bitrise.io', new AbortController().signal);
    expect(result.status).toBe(200);
    expect(result.category).toBe('ok');
  });

  it('returns unreachable when both HEAD and GET fail', async () => {
    fetch.mockRejectedValue(new Error('ECONNREFUSED'));
    const result = await checkUrl('/source', '/page', 'https://bitrise.io', new AbortController().signal);
    expect(result.category).toBe('unreachable');
    expect(result.status).toBeNull();
    expect(result.error).toContain('ECONNREFUSED');
  });

  it('returns unreachable on AbortError (timeout)', async () => {
    const abortErr = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    fetch.mockRejectedValue(abortErr);
    const result = await checkUrl('/source', '/page', 'https://bitrise.io', new AbortController().signal);
    expect(result.category).toBe('unreachable');
    expect(result.error).toMatch(/timeout/i);
  });
});

describe('buildCheckPlan', () => {
  const makeResult = (source, target, category, finalUrl = null) => ({
    source,
    target,
    resolvedUrl: `https://bitrise.io${target}`,
    status: category === 'ok' ? 200 : category === 'broken' ? 404 : 301,
    finalUrl,
    responseTime: 100,
    category,
    error: null,
  });

  it('preserves a direct-ok entry with unchanged target', () => {
    const rows = [{ source: '/foo', target: '/bar' }];
    const prev = new Map([['/foo', makeResult('/foo', '/bar', 'ok')]]);
    const { preserved, toCheck } = buildCheckPlan(rows, prev);
    expect(preserved).toHaveLength(1);
    expect(preserved[0].source).toBe('/foo');
    expect(toCheck).toHaveLength(0);
  });

  it('rechecks when target changed', () => {
    const rows = [{ source: '/foo', target: '/new-bar' }];
    const prev = new Map([['/foo', makeResult('/foo', '/bar', 'ok')]]);
    const { preserved, toCheck } = buildCheckPlan(rows, prev);
    expect(preserved).toHaveLength(0);
    expect(toCheck).toHaveLength(1);
    expect(toCheck[0].target).toBe('/new-bar');
  });

  it('rechecks when previous category was not ok', () => {
    for (const category of ['broken', 'error', 'unreachable']) {
      const rows = [{ source: '/foo', target: '/bar' }];
      const prev = new Map([['/foo', makeResult('/foo', '/bar', category)]]);
      const { preserved, toCheck } = buildCheckPlan(rows, prev);
      expect(preserved).toHaveLength(0);
      expect(toCheck).toHaveLength(1);
    }
  });

  it('rechecks when previous ok was via redirect (finalUrl set)', () => {
    const rows = [{ source: '/foo', target: '/bar' }];
    const prev = new Map([['/foo', makeResult('/foo', '/bar', 'ok', 'https://bitrise.io/final')]]);
    const { preserved, toCheck } = buildCheckPlan(rows, prev);
    expect(preserved).toHaveLength(0);
    expect(toCheck).toHaveLength(1);
  });

  it('rechecks new sources absent from previous results', () => {
    const rows = [{ source: '/new', target: '/page' }];
    const { preserved, toCheck } = buildCheckPlan(rows, new Map());
    expect(preserved).toHaveLength(0);
    expect(toCheck).toHaveLength(1);
  });

  it('handles mix of preserved and rechecked entries', () => {
    const rows = [
      { source: '/ok', target: '/bar' },
      { source: '/broken', target: '/baz' },
      { source: '/changed', target: '/new-target' },
      { source: '/via-redirect', target: '/bar' },
      { source: '/new', target: '/qux' },
    ];
    const prev = new Map([
      ['/ok', makeResult('/ok', '/bar', 'ok')],
      ['/broken', makeResult('/broken', '/baz', 'broken')],
      ['/changed', makeResult('/changed', '/old-target', 'ok')],
      ['/via-redirect', makeResult('/via-redirect', '/bar', 'ok', 'https://bitrise.io/final')],
    ]);
    const { preserved, toCheck } = buildCheckPlan(rows, prev);
    expect(preserved).toHaveLength(1);
    expect(preserved[0].source).toBe('/ok');
    expect(toCheck.map((r) => r.source)).toEqual(['/broken', '/changed', '/via-redirect', '/new']);
  });

  it('returns empty toCheck when all entries are direct-ok and unchanged', () => {
    const rows = [
      { source: '/a', target: '/x' },
      { source: '/b', target: '/y' },
    ];
    const prev = new Map([
      ['/a', makeResult('/a', '/x', 'ok')],
      ['/b', makeResult('/b', '/y', 'ok')],
    ]);
    const { preserved, toCheck } = buildCheckPlan(rows, prev);
    expect(preserved).toHaveLength(2);
    expect(toCheck).toHaveLength(0);
  });
});
