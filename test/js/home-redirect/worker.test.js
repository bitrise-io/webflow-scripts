import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../../../src/js/home-redirect/worker';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(new Response('OK'));
});

function makeRequest(url, cookies = '') {
  return new Request(url, {
    headers: cookies ? { Cookie: cookies } : {},
  });
}

describe('home-redirect worker', () => {
  it('redirects to app.bitrise.io when redirect cookie is present', async () => {
    const response = await worker.fetch(makeRequest('https://bitrise.io/', 'webflow_user_redirect=1'));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://app.bitrise.io/');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('passes through when redirect cookie is absent', async () => {
    await worker.fetch(makeRequest('https://bitrise.io/'));
    expect(mockFetch).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://bitrise.io/' }));
  });

  it('passes through when redirect cookie has a value other than 1', async () => {
    await worker.fetch(makeRequest('https://bitrise.io/', 'webflow_user_redirect=0'));
    expect(mockFetch).toHaveBeenCalled();
  });

  it('ignores unrelated cookies and passes through', async () => {
    await worker.fetch(makeRequest('https://bitrise.io/', 'session=abc123; tracking=xyz'));
    expect(mockFetch).toHaveBeenCalled();
  });

  it('redirects when redirect cookie appears among other cookies', async () => {
    const response = await worker.fetch(
      makeRequest('https://bitrise.io/', 'session=abc123; webflow_user_redirect=1; other=val'),
    );
    expect(response.status).toBe(302);
  });
});
