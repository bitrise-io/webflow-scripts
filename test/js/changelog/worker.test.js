import { beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../../../src/js/changelog/worker';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const cache = { match: vi.fn(), put: vi.fn() };
vi.stubGlobal('caches', { default: cache });

const ctx = { waitUntil: vi.fn() };
const requestedUrls = () => mockFetch.mock.calls.map(([url]) => String(url));
const get = (url) => worker.fetch(new Request(url), {}, ctx);

const SNAPSHOT_URL = 'https://web-cdn.bitrise.io/changelog_topics/26552.json';
const DISCOURSE_URL = 'https://discuss.bitrise.io/t/some-topic/26552.json';

beforeEach(() => {
  mockFetch.mockReset();
  cache.match.mockReset();
  cache.put.mockReset();
  cache.match.mockResolvedValue(undefined);
});

describe('/changelog/api/t/*', () => {
  it('serves the snapshot without contacting Discourse', async () => {
    mockFetch.mockResolvedValue(
      new Response('{"id":26552}', { headers: { 'Content-Type': 'application/octet-stream' } }),
    );

    const response = await get('https://bitrise.io/changelog/api/t/some-topic/26552.json');

    expect(requestedUrls()).toEqual([SNAPSHOT_URL]);
    expect(await response.json()).toEqual({ id: 26552 });
    expect(response.headers.get('X-Proxy-Cache')).toBe('SNAPSHOT');
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('resolves the snapshot for id-only topic paths', async () => {
    mockFetch.mockResolvedValue(new Response('{"id":26552}'));

    await get('https://app.bitrise.io/changelog/api/t/26552.json');

    expect(requestedUrls()).toEqual([SNAPSHOT_URL]);
  });

  it('falls back to Discourse when the topic has no snapshot yet', async () => {
    mockFetch.mockImplementation(async (url) =>
      String(url) === SNAPSHOT_URL ? new Response('Not found', { status: 404 }) : new Response('{"id":26552}'),
    );

    const response = await get('https://bitrise.io/changelog/api/t/some-topic/26552.json');

    expect(requestedUrls()).toEqual([SNAPSHOT_URL, DISCOURSE_URL]);
    expect(response.headers.get('X-Proxy-Cache')).toBe('MISS');
    expect(await response.json()).toEqual({ id: 26552 });
  });

  it('falls back to Discourse when the snapshot host is unreachable', async () => {
    mockFetch.mockImplementation(async (url) => {
      if (String(url) === SNAPSHOT_URL) throw new Error('network');
      return new Response('{"id":26552}');
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const response = await get('https://bitrise.io/changelog/api/t/some-topic/26552.json');

    expect(requestedUrls()).toEqual([SNAPSHOT_URL, DISCOURSE_URL]);
    expect(response.status).toBe(200);
  });

  it('does not look for snapshots of non-topic Discourse paths', async () => {
    mockFetch.mockResolvedValue(new Response('{}'));

    await get('https://bitrise.io/changelog/api/c/changelog/6.json');

    expect(requestedUrls()).toEqual(['https://discuss.bitrise.io/c/changelog/6.json']);
  });
});
