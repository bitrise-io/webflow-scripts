import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { renderStepDetail, isStepDetailRendered } from '../../../src/js/integrations/renderStepDetail';
import { createMockIntegrations, STEP_DETAIL_HTML } from './fixtures';

describe('renderStepDetail', () => {
  let dom;
  let doc;
  let integrations;

  beforeEach(() => {
    dom = new JSDOM(STEP_DETAIL_HTML);
    doc = dom.window.document;
    integrations = createMockIntegrations();
  });

  it('renders step title and metadata', () => {
    const url = new URL('https://bitrise.io/integrations/steps/deploy-to-bitrise-io');
    const step = renderStepDetail(doc, integrations, url);

    expect(step).not.toBeNull();
    expect(step.title).toBe('Deploy to Bitrise.io');
    expect(doc.title).toBe('Deploy to Bitrise.io | Bitrise Integration Steps');
    expect(doc.querySelector("link[rel='canonical']").getAttribute('href')).toBe(
      'https://bitrise.io/integrations/steps/deploy-to-bitrise-io',
    );
  });

  it('renders header section', () => {
    const url = new URL('https://bitrise.io/integrations/steps/deploy-to-bitrise-io');
    renderStepDetail(doc, integrations, url);

    expect(doc.getElementById('integrations-step-details-title').innerHTML).toBe('Deploy to Bitrise.io');
    expect(doc.getElementById('integrations-step-details-icon').src).toBe('https://example.com/icon.svg');
  });

  it('renders description section', () => {
    const url = new URL('https://bitrise.io/integrations/steps/deploy-to-bitrise-io');
    renderStepDetail(doc, integrations, url);

    const description = doc.querySelector('#integrations-step-details-description > div').innerHTML;
    expect(description).toContain('Deploys artifacts to Bitrise.io');
  });

  it('renders github button link', () => {
    const url = new URL('https://bitrise.io/integrations/steps/deploy-to-bitrise-io');
    renderStepDetail(doc, integrations, url);

    expect(doc.getElementById('integrations-step-details-github-buttom').href).toBe(
      'https://github.com/bitrise-steplib/steps-deploy-to-bitrise-io',
    );
  });

  it('sets meta tags', () => {
    const url = new URL('https://bitrise.io/integrations/steps/deploy-to-bitrise-io');
    renderStepDetail(doc, integrations, url);

    expect(doc.querySelector('meta[name="description"]').content).toBe('Deploys build artifacts to Bitrise');
    expect(doc.querySelector('meta[property="og:title"]').content).toBe(
      'Deploy to Bitrise.io | Bitrise Integration Steps',
    );
  });

  it('returns null for unknown step', () => {
    const url = new URL('https://bitrise.io/integrations/steps/nonexistent-step');
    const step = renderStepDetail(doc, integrations, url);

    expect(step).toBeNull();
  });

  it('sets rendered flag', () => {
    const url = new URL('https://bitrise.io/integrations/steps/deploy-to-bitrise-io');
    expect(isStepDetailRendered(doc)).toBe(false);

    renderStepDetail(doc, integrations, url);

    expect(isStepDetailRendered(doc)).toBe(true);
  });

  it('renders similar steps', () => {
    const url = new URL('https://bitrise.io/integrations/steps/xcode-build');
    renderStepDetail(doc, integrations, url);

    const similarSteps = doc.getElementById('integrations-step-details-similar-steps');
    const cards = similarSteps.querySelectorAll('.step-card');
    expect(cards.length).toBeGreaterThan(0);
  });

  it('serializes to valid HTML', () => {
    const url = new URL('https://bitrise.io/integrations/steps/deploy-to-bitrise-io');
    renderStepDetail(doc, integrations, url);

    const html = dom.serialize();
    expect(html).toContain('Deploy to Bitrise.io');
    expect(html).toContain('data-integrations-step-rendered');
  });
});
