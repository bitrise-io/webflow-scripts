import { describe, it, expect, vi, beforeEach } from 'vitest';

const PRERENDERED = 'https://storage.googleapis.com/web-cdn.bitrise.io/webflow-ssr';
const html = (body) => new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
const ctx = { waitUntil: vi.fn() };

let dataAvailable;
const mockFetch = vi.fn(async (input) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url === `${PRERENDERED}/integrations-data.json`) {
    return dataAvailable
      ? new Response(JSON.stringify({ steps: { 'current-step': {} } }), {
          headers: { 'Content-Type': 'application/json' },
        })
      : new Response('error', { status: 500 });
  }
  if (url === `${PRERENDERED}/integrations/current-step.html`) return html('prerendered current-step');
  if (url === `${PRERENDERED}/integrations/old-step.html`) return html('prerendered old-step');
  if (url.startsWith('https://bitrise.io/integrations/step')) {
    return html('<link href="https://bitrise.io/integrations/step" rel="canonical">template');
  }
  return new Response('not found', { status: 404 });
});

vi.stubGlobal('fetch', mockFetch);
vi.stubGlobal('caches', { default: { match: async () => undefined, put: async () => {} } });

// The worker keeps the step list in module state, so every test gets a fresh copy.
const loadWorker = async () => {
  vi.resetModules();
  return (await import('../../../src/js/integrations/worker')).default;
};

const get = async (worker, path) => (await worker.fetch(new Request(`https://bitrise.io${path}`), {}, ctx)).text();

beforeEach(() => {
  mockFetch.mockClear();
  dataAvailable = true;
});

describe('pre-rendered step pages', () => {
  it('serves the page of a step in the current steplib', async () => {
    expect(await get(await loadWorker(), '/integrations/steps/current-step')).toBe('prerendered current-step');
  });

  it('does not serve a page left in the bucket by a step that is no longer in the steplib', async () => {
    const body = await get(await loadWorker(), '/integrations/steps/old-step');
    expect(body).not.toContain('prerendered');
    expect(body).toContain('rel="canonical"');
    expect(body).toContain('https://bitrise.io/integrations/steps/old-step');
  });

  it('serves pre-rendered pages without the check when the step list cannot be loaded', async () => {
    dataAvailable = false;
    expect(await get(await loadWorker(), '/integrations/steps/old-step')).toBe('prerendered old-step');
  });
});
