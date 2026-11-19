// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ensureLoader } from '../../../src/js/bitrise-navigation/loader';

const loaderScript = () => document.head.querySelector('script[data-bitrise-navigation-loader]');

describe('ensureLoader', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete window.bitriseNavigationManifest;
    vi.stubGlobal('process', { ...process, env: { ...process.env, NODE_ENV: 'production' } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the hashed payload named by the release manifest, without cache busting', () => {
    window.bitriseNavigationManifest = { base: 'https://cdn.test/', data: 'bitrise-navigation/data.abc123.js' };
    ensureLoader();
    expect(loaderScript().src).toBe('https://cdn.test/bitrise-navigation/data.abc123.js');
  });

  it('falls back to the stable loader URL with an hourly cache buster when there is no manifest', () => {
    ensureLoader();
    expect(loaderScript().src).toMatch(/^https:\/\/web-cdn\.bitrise\.io\/bitrise-navigation-loader\.js\?v=\d+$/);
  });

  it('ignores an incomplete manifest', () => {
    window.bitriseNavigationManifest = { base: 'https://cdn.test/' };
    ensureLoader();
    expect(loaderScript().src).toContain('bitrise-navigation-loader.js?v=');
  });

  it('only adds the script once', () => {
    ensureLoader();
    ensureLoader();
    expect(document.head.querySelectorAll('script[data-bitrise-navigation-loader]')).toHaveLength(1);
  });
});
