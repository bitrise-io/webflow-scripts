import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../../../src/js/home-redirect/worker';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const ctx = { passThroughOnException: vi.fn() };

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(new Response('OK', { headers: { 'Content-Type': 'text/html' } }));
});

function fetch(url, { cookies = '', referrer = '' } = {}) {
  const headers = {};
  if (cookies) headers['Cookie'] = cookies;
  if (referrer) headers['Referer'] = referrer;
  return worker.fetch(new Request(url, { headers }), {}, ctx);
}

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

  it('redirects to /home with no-cache headers when logged in with a bitrise.io referrer', async () => {
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
    expect(response.headers.get('Location')).toBe('https://app.bitrise.io');
    expectNoCacheHeaders(response);
  });

  it('redirects to app.bitrise.io when logged in with an external referrer', async () => {
    const response = await fetch('https://bitrise.io/', {
      cookies: 'webflow_user_redirect=1',
      referrer: 'https://google.com',
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://app.bitrise.io');
  });
});

describe('/home', () => {
  it('fetches root from origin without cookie when logged in', async () => {
    const response = await fetch('https://bitrise.io/home', { cookies: 'webflow_user_redirect=1' });
    expect(mockFetch).toHaveBeenCalledWith('https://bitrise.io/', expect.objectContaining({ headers: expect.any(Headers) }));
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
