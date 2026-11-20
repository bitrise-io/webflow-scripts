import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import worker from '../../../src/js/maintenance/worker';

const PAGE_URL = 'https://webflow-scripts.bitrise.io/maintenance.html';
// The worker caches the page in the background; the tests wait for it through `settle`.
let pending = [];
const ctx = { waitUntil: (promise) => pending.push(promise) };
const settle = () => Promise.all(pending);

let cacheStore;
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);
vi.stubGlobal('caches', {
  default: {
    // Like the real cache, every match is a new response with a body that can be read.
    match: async (key) => (cacheStore.has(key) ? new Response(cacheStore.get(key)) : undefined),
    put: async (key, response) => {
      cacheStore.set(key, await response.text());
    },
  },
});

const ENV = { MAINTENANCE_BYPASS_SECRET: 'open-sesame', MAINTENANCE_END: '2026-12-01T16:00:00Z' };

const request = (path, { accept = 'text/html', cookie = '', env = ENV } = {}) => {
  const headers = {};
  if (accept) headers.Accept = accept;
  if (cookie) headers.Cookie = cookie;
  return worker.fetch(new Request(`https://app.bitrise.io${path}`, { headers }), env, ctx);
};

beforeEach(() => {
  cacheStore = new Map();
  pending = [];
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (input) =>
    String(input.url || input) === PAGE_URL ? new Response('<html>maintenance page</html>') : new Response('origin'),
  );
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-20T12:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('answers', () => {
  it('serves the maintenance page to browsers, with the end of the maintenance as Retry-After', async () => {
    const response = await request('/maintenance.html');
    expect(response.status).toBe(503);
    expect(response.headers.get('Content-Type')).toBe('text/html');
    expect(response.headers.get('Retry-After')).toBe('Tue, 01 Dec 2026 16:00:00 GMT');
    expect(await response.text()).toBe('<html>maintenance page</html>');
  });

  it('answers API clients with JSON and everything else with plain text', async () => {
    const json = await request('/x', { accept: 'application/json' });
    expect(json.status).toBe(503);
    expect(await json.json()).toEqual({ error: 'Service under maintenance' });

    const text = await request('/x', { accept: '*/*' });
    expect(text.status).toBe(503);
    expect(text.headers.get('Content-Type')).toBe('text/plain');
    expect(await text.text()).toBe('Service under maintenance');
  });
});

describe('Retry-After', () => {
  it.each([
    ['not set', undefined],
    ['not a date', 'next week'],
    ['already past', '2026-03-21T16:00:00Z'],
  ])('is left out when MAINTENANCE_END is %s', async (_name, end) => {
    const response = await request('/x', { env: { ...ENV, MAINTENANCE_END: end } });
    expect(response.status).toBe(503);
    expect(response.headers.has('Retry-After')).toBe(false);
  });
});

describe('maintenance page', () => {
  it('is cached after it was loaded', async () => {
    await request('/x');
    await settle();
    expect(cacheStore.has(PAGE_URL)).toBe(true);
    mockFetch.mockClear();
    expect(await (await request('/x')).text()).toBe('<html>maintenance page</html>');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('is replaced by a built-in page, which is not cached, when it cannot be loaded', async () => {
    mockFetch.mockImplementation(async () => new Response('Not found', { status: 404 }));
    const response = await request('/x');
    expect(response.status).toBe(503);
    expect(await response.text()).toContain('Under maintenance');
    expect(cacheStore.size).toBe(0);

    mockFetch.mockImplementation(async () => {
      throw new Error('network');
    });
    expect(await (await request('/x')).text()).toContain('Under maintenance');
  });
});

describe('bypass', () => {
  it('sets the cookie for the secret and passes requests with the cookie to the origin', async () => {
    const response = await request('/maintenance.bypass?open-sesame');
    expect(response.status).toBe(200);
    expect(response.headers.get('Set-Cookie')).toContain('maintenance_bypass=open-sesame;');

    const bypassed = await request('/dashboard', { cookie: 'a=b; maintenance_bypass=open-sesame' });
    expect(await bypassed.text()).toBe('origin');
  });

  it('clears the cookie with ?off', async () => {
    const response = await request('/maintenance.bypass?off');
    expect(response.headers.get('Set-Cookie')).toContain('maintenance_bypass=;');
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  it('does not let a wrong secret, or a cookie that only contains the secret, through', async () => {
    expect((await request('/maintenance.bypass?nope')).headers.has('Set-Cookie')).toBe(false);
    expect((await request('/x', { cookie: 'maintenance_bypass=nope' })).status).toBe(503);
    expect((await request('/x', { cookie: 'not_maintenance_bypass=open-sesame' })).status).toBe(503);
    expect((await request('/x', { cookie: 'maintenance_bypass=open-sesame-and-more' })).status).toBe(503);
  });

  it('is off when no secret is set', async () => {
    const env = { MAINTENANCE_END: ENV.MAINTENANCE_END };
    expect((await request('/maintenance.bypass?purrequest', { env })).headers.has('Set-Cookie')).toBe(false);
    expect((await request('/x', { env, cookie: 'maintenance_bypass=' })).status).toBe(503);
    expect((await request('/x', { env, cookie: 'maintenance_bypass=undefined' })).status).toBe(503);
  });
});
