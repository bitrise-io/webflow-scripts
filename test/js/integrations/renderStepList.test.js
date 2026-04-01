import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderStepList, isStepListRendered } from '../../../src/js/integrations/renderStepList';
import { createMockIntegrations, STEP_LIST_HTML } from './fixtures';

describe('renderStepList', () => {
  let dom;
  let doc;
  let integrations;

  beforeEach(() => {
    dom = new JSDOM(STEP_LIST_HTML);
    doc = dom.window.document;
    integrations = createMockIntegrations();
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

    const cards = doc.querySelectorAll('.step-card');
    expect(cards.length).toBe(3);
  });

  it('filters by platform', () => {
    const url = new URL('https://bitrise.io/integrations?platform=ios');
    renderStepList(doc, integrations, url);

    const cards = doc.querySelectorAll('.step-card');
    expect(cards.length).toBe(2);
  });

  it('filters by query', () => {
    const url = new URL('https://bitrise.io/integrations?query=gradle');
    renderStepList(doc, integrations, url);

    const cards = doc.querySelectorAll('.step-card');
    expect(cards.length).toBe(1);
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
