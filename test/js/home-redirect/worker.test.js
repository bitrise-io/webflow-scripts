import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../../../src/js/home-redirect/worker';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const ctx = { passThroughOnException: vi.fn() };

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(new Response('OK'));
});

function fetch(url, { cookies = '', referrer = '' } = {}) {
  const headers = {};
  if (cookies) headers['Cookie'] = cookies;
  if (referrer) headers['Referer'] = referrer;
  return worker.fetch(new Request(url, { headers }), {}, ctx);
}

describe('/ (root)', () => {
  it('passes through when not logged in', async () => {
    await fetch('https://bitrise.io/');
    expect(mockFetch).toHaveBeenCalled();
  });

  it('passes through when not logged in even with a bitrise referrer', async () => {
    await fetch('https://bitrise.io/', { referrer: 'https://bitrise.io/pricing' });
    expect(mockFetch).toHaveBeenCalled();
  });

  it('redirects to /home when logged in with a bitrise.io referrer', async () => {
    const response = await fetch('https://bitrise.io/', {
      cookies: 'webflow_user_redirect=1',
      referrer: 'https://bitrise.io/blog',
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://bitrise.io/home');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('redirects to app.bitrise.io when logged in with no referrer', async () => {
    const response = await fetch('https://bitrise.io/', { cookies: 'webflow_user_redirect=1' });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://app.bitrise.io/');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('redirects to app.bitrise.io when logged in with an external referrer', async () => {
    const response = await fetch('https://bitrise.io/', {
      cookies: 'webflow_user_redirect=1',
      referrer: 'https://google.com',
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://app.bitrise.io/');
  });
});

describe('/home', () => {
  it('fetches root from origin without cookie when logged in', async () => {
    await fetch('https://bitrise.io/home', { cookies: 'webflow_user_redirect=1' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://bitrise.io/',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const passedHeaders = mockFetch.mock.calls[0][1].headers;
    expect(passedHeaders.get('Cookie')).toBeNull();
  });

  it('fetches root from origin without cookie when not logged in', async () => {
    await fetch('https://bitrise.io/home');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://bitrise.io/',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const passedHeaders = mockFetch.mock.calls[0][1].headers;
    expect(passedHeaders.get('Cookie')).toBeNull();
  });
});
