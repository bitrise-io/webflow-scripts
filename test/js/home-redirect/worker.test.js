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
  it('redirects to app.bitrise.io when logged in and referred from bitrise.io', async () => {
    const response = await fetch('https://bitrise.io/', {
      cookies: 'webflow_user_redirect=1',
      referrer: 'https://bitrise.io/blog',
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://app.bitrise.io/');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('passes through when logged in but referred from an external site', async () => {
    await fetch('https://bitrise.io/', {
      cookies: 'webflow_user_redirect=1',
      referrer: 'https://google.com',
    });
    expect(mockFetch).toHaveBeenCalled();
  });

  it('passes through when logged in with no referrer', async () => {
    await fetch('https://bitrise.io/', { cookies: 'webflow_user_redirect=1' });
    expect(mockFetch).toHaveBeenCalled();
  });

  it('passes through when not logged in', async () => {
    await fetch('https://bitrise.io/', { referrer: 'https://bitrise.io/pricing' });
    expect(mockFetch).toHaveBeenCalled();
  });

  it('passes through when cookie value is not 1', async () => {
    await fetch('https://bitrise.io/', {
      cookies: 'webflow_user_redirect=0',
      referrer: 'https://bitrise.io/pricing',
    });
    expect(mockFetch).toHaveBeenCalled();
  });
});

describe('/home', () => {
  it('fetches root from origin when logged in, avoiding the origin 301 /home→/ loop', async () => {
    await fetch('https://bitrise.io/home', { cookies: 'webflow_user_redirect=1' });
    expect(mockFetch).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://bitrise.io/' }));
  });

  it('redirects to root when not logged in', async () => {
    const response = await fetch('https://bitrise.io/home');
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://bitrise.io/');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('cookie parsing', () => {
  it('redirects at root when cookie appears among other cookies', async () => {
    const response = await fetch('https://bitrise.io/', {
      cookies: 'session=abc; webflow_user_redirect=1; other=val',
      referrer: 'https://bitrise.io/pricing',
    });
    expect(response.status).toBe(302);
  });

  it('fetches root from origin at /home when cookie appears among other cookies', async () => {
    await fetch('https://bitrise.io/home', { cookies: 'session=abc; webflow_user_redirect=1; other=val' });
    expect(mockFetch).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://bitrise.io/' }));
  });
});
