import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderStepList, isStepListRendered } from '../../../src/js/integrations/renderStepList';
import { createMockIntegrations, STEP_LIST_HTML } from './fixtures';

/**
 * Filtering is applied client-side by StepListSection.update(), which toggles
 * `display-none` on cards/grids inside a requestAnimationFrame callback (see
 * StepListSection.js). renderStepList() itself always renders the full,
 * unfiltered list so the SSR output stays cacheable regardless of query params.
 * @param {Document} doc
 * @returns {Element[]} step-cards that are actually visible (not display-none,
 * and not inside a display-none grid, e.g. the leftover Webflow template grid)
 */
function visibleStepCards(doc) {
  return Array.from(doc.querySelectorAll('.step-card')).filter(
    (card) => !card.classList.contains('display-none') && !card.closest('.step_grid').classList.contains('display-none'),
  );
}

function nextFrame() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('renderStepList', () => {
  let dom;
  let doc;
  let integrations;

  beforeEach(() => {
    dom = new JSDOM(STEP_LIST_HTML);
    doc = dom.window.document;
    integrations = createMockIntegrations();
    vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 0));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders all step categories', () => {
    const url = new URL('https://bitrise.io/integrations');
    renderStepList(doc, integrations, url);

    const grids = doc.querySelectorAll('.step_grid');
    expect(grids.length).toBeGreaterThan(0);
  });

  it('renders step cards', () => {
    const url = new URL('https://bitrise.io/integrations');
    renderStepList(doc, integrations, url);

    expect(visibleStepCards(doc).length).toBe(3);
  });

  it('filters by platform', async () => {
    const url = new URL('https://bitrise.io/integrations?platform=ios');
    const { content } = renderStepList(doc, integrations, url);
    content.update(integrations, url.searchParams.get('platform'), url.searchParams.get('category'), url.searchParams.get('query'));
    await nextFrame();

    expect(visibleStepCards(doc).length).toBe(2);
  });

  it('filters by query', async () => {
    const url = new URL('https://bitrise.io/integrations?query=gradle');
    const { content } = renderStepList(doc, integrations, url);
    content.update(integrations, url.searchParams.get('platform'), url.searchParams.get('category'), url.searchParams.get('query'));
    await nextFrame();

    expect(visibleStepCards(doc).length).toBe(1);
  });

  it('sets rendered flag', () => {
    const url = new URL('https://bitrise.io/integrations');
    expect(isStepListRendered(doc)).toBe(false);

    renderStepList(doc, integrations, url);

    expect(isStepListRendered(doc)).toBe(true);
  });

  it('renders sidebar platform items', () => {
    const url = new URL('https://bitrise.io/integrations');
    renderStepList(doc, integrations, url);

    const navItems = doc.querySelectorAll('.w-nav nav a');
    expect(navItems.length).toBeGreaterThan(0);
  });

  it('serializes to valid HTML', () => {
    const url = new URL('https://bitrise.io/integrations');
    renderStepList(doc, integrations, url);

    const html = dom.serialize();
    expect(html).toContain('Xcode Build');
    expect(html).toContain('Gradle Runner');
    expect(html).toContain('data-integrations-list-rendered');
  });
});
