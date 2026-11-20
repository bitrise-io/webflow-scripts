import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../../../src/js/home-redirect/worker';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const ctx = { passThroughOnException: vi.fn() };

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(new Response('OK', { headers: { 'Content-Type': 'text/html' } }));
});

/**
 *
 * @param url
 * @param root0
 * @param root0.cookies
 * @param root0.referrer
 */
function fetch(url, { cookies = '', referrer = '' } = {}) {
  const headers = {};
  if (cookies) headers.Cookie = cookies;
  if (referrer) headers.Referer = referrer;
  return worker.fetch(new Request(url, { headers }), {}, ctx);
}

/**
 *
 * @param response
 */
function expectNoCacheHeaders(response) {
  expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate, private');
  expect(response.headers.get('Vary')).toBe('Cookie, Referer');
}

describe('/ (root)', () => {
  it('passes through with no-cache headers when not logged in', async () => {
    const response = await fetch('https://bitrise.io/');
    expect(mockFetch).toHaveBeenCalled();
    expectNoCacheHeaders(response);
  });

  it('redirects to /home when logged in with a bitrise referrer', async () => {
    const response = await fetch('https://bitrise.io/', {
      cookies: 'webflow_user_redirect=1',
      referrer: 'https://bitrise.io/blog',
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://bitrise.io/home');
    expectNoCacheHeaders(response);
  });

  it('redirects to app.bitrise.io with no-cache headers when logged in with no referrer', async () => {
    const response = await fetch('https://bitrise.io/', { cookies: 'webflow_user_redirect=1' });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://app.bitrise.io/');
    expectNoCacheHeaders(response);
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

describe('URLs with a query string', () => {
  it('sends a logged-in visitor of /?utm_source=x to the app, without the query string', async () => {
    const response = await fetch('https://bitrise.io/?utm_source=x&utm_campaign=y', {
      cookies: 'webflow_user_redirect=1',
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://app.bitrise.io/');
  });

  it('sends a logged-in visitor with a bitrise referrer to /home, without the query string', async () => {
    const response = await fetch('https://bitrise.io/?utm_source=x', {
      cookies: 'webflow_user_redirect=1',
      referrer: 'https://bitrise.io/blog',
    });
    expect(response.headers.get('Location')).toBe('https://bitrise.io/home');
  });

  it('passes /?utm_source=x through unchanged when not logged in', async () => {
    const response = await fetch('https://bitrise.io/?utm_source=x');
    expect(mockFetch.mock.calls[0][0].url).toBe('https://bitrise.io/?utm_source=x');
    expectNoCacheHeaders(response);
  });

  it('treats /home?x=1 like /home', async () => {
    const loggedOut = await fetch('https://bitrise.io/home?x=1');
    expect(loggedOut.status).toBe(302);
    expect(loggedOut.headers.get('Location')).toBe('https://bitrise.io/');

    await fetch('https://bitrise.io/home?x=1', { cookies: 'webflow_user_redirect=1' });
    expect(mockFetch).toHaveBeenCalledWith('https://bitrise.io/', expect.anything());
  });
});

describe('/home', () => {
  it('fetches root from origin without cookie when logged in', async () => {
    const response = await fetch('https://bitrise.io/home', { cookies: 'webflow_user_redirect=1' });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://bitrise.io/',
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const passedHeaders = mockFetch.mock.calls[0][1].headers;
    expect(passedHeaders.get('Cookie')).toBeNull();
    expectNoCacheHeaders(response);
  });

  it('redirects to / when not logged in', async () => {
    const response = await fetch('https://bitrise.io/home');
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://bitrise.io/');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
