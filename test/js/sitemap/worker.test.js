import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../../../src/js/sitemap/worker';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

describe('sitemap worker', () => {
  it('serves the sitemap from the CDN bucket, with its headers', async () => {
    mockFetch.mockResolvedValue(
      new Response('<urlset/>', {
        headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
      }),
    );
    const response = await worker.fetch(new Request('https://bitrise.io/sitemap.xml'));
    expect(mockFetch).toHaveBeenCalledWith('https://web-cdn.bitrise.io/sitemap.xml');
    expect(response.headers.get('Content-Type')).toBe('application/xml');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
    expect(await response.text()).toBe('<urlset/>');
  });

  it('passes on an error of the bucket', async () => {
    mockFetch.mockResolvedValue(new Response('Not found', { status: 404 }));
    expect((await worker.fetch(new Request('https://bitrise.io/sitemap.xml'))).status).toBe(404);
  });

  it('answers 502, without a stack trace, when the bucket cannot be reached', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('network');
    });
    const response = await worker.fetch(new Request('https://bitrise.io/sitemap.xml'));
    expect(response.status).toBe(502);
    expect(await response.text()).toBe('Sitemap unavailable');
  });
});
