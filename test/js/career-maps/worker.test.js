import { describe, it, expect, vi, beforeEach } from 'vitest';

const PRERENDERED = 'https://storage.googleapis.com/web-cdn.bitrise.io/webflow-ssr';
const html = (body) => new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
const json = (body) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
const ctx = { waitUntil: vi.fn() };

let indexAvailable;
let compactDataAvailable;
const mockFetch = vi.fn(async (input) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url === `${PRERENDERED}/career-maps-pages.json`) {
    return indexAvailable
      ? json({
          pages: ['engineering/software-engineer/p2', 'engineering/software-engineer/p3'],
          redirects: {
            engineering: 'engineering/software-engineer/p2',
            'engineering/software-engineer': 'engineering/software-engineer/p2',
          },
        })
      : new Response('error', { status: 500 });
  }
  if (url === `${PRERENDERED}/career-maps-data.json`) {
    return compactDataAvailable ? json([{ name: 'compact' }]) : new Response('missing', { status: 404 });
  }
  if (url === 'https://web-cdn.bitrise.io/career-maps.json') return json([{ name: 'full' }]);
  if (url === `${PRERENDERED}/careers/maps.html`) return html('prerendered overview');
  if (url === `${PRERENDERED}/careers/maps/engineering/software-engineer/p2.html`) return html('prerendered p2');
  // p3 is in the index, but its page cannot be loaded
  if (url === `${PRERENDERED}/careers/maps/engineering/old-job/p2.html`) return html('prerendered old page');
  if (url.startsWith('https://bitrise.io/careers/maps/team')) {
    return html('<link href="https://bitrise.io/careers/maps/team" rel="canonical">level template');
  }
  if (url.startsWith('https://bitrise.io/careers/maps')) {
    return html('<link href="https://bitrise.io/careers/maps" rel="canonical">overview template');
  }
  if (url === 'https://bitrise.io/404') return html('not found page');
  return new Response('not found', { status: 404 });
});

vi.stubGlobal('fetch', mockFetch);
vi.stubGlobal('caches', { default: { match: async () => undefined, put: async () => {} } });

// The worker keeps the page index in module state, so every test gets a fresh copy.
const loadWorker = async () => {
  vi.resetModules();
  return (await import('../../../src/js/career-maps/worker')).default;
};

const request = async (path) => (await loadWorker()).fetch(new Request(`https://bitrise.io${path}`), {}, ctx);

beforeEach(() => {
  mockFetch.mockClear();
  indexAvailable = true;
  compactDataAvailable = true;
});

describe('pre-rendered pages', () => {
  it('serves the overview, with or without a trailing slash', async () => {
    expect(await (await request('/careers/maps')).text()).toBe('prerendered overview');
    expect(await (await request('/careers/maps/')).text()).toBe('prerendered overview');
  });

  it('serves a level page from the index', async () => {
    const response = await request('/careers/maps/engineering/software-engineer/p2');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect(await response.text()).toBe('prerendered p2');
  });

  it('serves the template with the canonical URL of the page when the page cannot be loaded', async () => {
    const body = await (await request('/careers/maps/engineering/software-engineer/p3/')).text();
    expect(body).toBe(
      '<link href="https://bitrise.io/careers/maps/engineering/software-engineer/p3" rel="canonical">level template',
    );
  });
});

describe('paths that are not level pages', () => {
  it.each(['/careers/maps/engineering', '/careers/maps/engineering/software-engineer/'])(
    'redirects %s to the first level',
    async (path) => {
      const response = await request(path);
      expect(response.status).toBe(301);
      expect(response.headers.get('Location')).toBe('https://bitrise.io/careers/maps/engineering/software-engineer/p2');
    },
  );

  it('redirects the old template path, which was in the sitemap, to the overview', async () => {
    const response = await request('/careers/maps/team');
    expect(response.status).toBe(301);
    expect(response.headers.get('Location')).toBe('https://bitrise.io/careers/maps');
  });

  // old-job/p2 is a page left in the bucket: it is not in the index, so it is not served.
  it.each(['/careers/maps/nope', '/careers/maps/engineering/old-job/p2'])('answers 404 for %s', async (path) => {
    const response = await request(path);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('not found page');
  });

  it('passes paths that are not slugs on to Webflow, without reading the bucket', async () => {
    await request('/careers/maps/..%2Fintegrations');
    expect(mockFetch.mock.calls.map(([input]) => String(input.url || input))).toEqual([
      'https://bitrise.io/careers/maps/..%2Fintegrations',
    ]);
  });
});

describe('without the page index (before the first SSR run)', () => {
  it('serves pre-rendered pages, and the template for anything else, as before', async () => {
    indexAvailable = false;
    expect(await (await request('/careers/maps/engineering/software-engineer/p2')).text()).toBe('prerendered p2');
    const body = await (await request('/careers/maps/nope')).text();
    expect(body).toContain('level template');
    expect(body).toContain('href="https://bitrise.io/careers/maps/nope"');
  });
});

describe('templates for the SSR job', () => {
  it('passes ?template=true requests to Webflow as they are, without redirects', async () => {
    expect(await (await request('/careers/maps/team?template=true')).text()).toContain('level template');
    expect(await (await request('/careers/maps?template=true')).text()).toContain('overview template');
    expect(mockFetch.mock.calls.some(([input]) => String(input.url || input).includes('webflow-ssr'))).toBe(false);
  });
});

describe('data.json', () => {
  it('serves the compact data with CORS', async () => {
    const response = await request('/careers/maps/data.json');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(await response.json()).toEqual([{ name: 'compact' }]);
  });

  it('falls back to the full file of the generator job', async () => {
    compactDataAvailable = false;
    expect(await (await request('/careers/maps/data.json')).json()).toEqual([{ name: 'full' }]);
  });
});
