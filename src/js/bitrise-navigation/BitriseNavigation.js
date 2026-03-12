import { cachedData, ensureLoader, addDataListener, cleanupFontsIfUnused } from './loader';
import { processCSS, injectFontFaces, buildShadowCSS, applyStyles, sanitizeHTML, clearShadowRoot } from './css';
import { bindNavBehaviour, bindSmartScroll } from './behaviour';

/** All currently-connected <bitrise-navigation> elements. */
export const connectedInstances = new Set();

const VALID_POSITIONS = ['static', 'sticky', 'smart'];

// ---- Rendering --------------------------------------------------------------

/**
 * Render the navigation HTML + CSS into a host element's shadow root.
 * @param {HTMLElement} host - A <bitrise-navigation> element with an attached shadow root.
 * @param {{ html: string, css: string }} data - Payload from the loader script.
 */
export function renderNavigation(host, data) {
  const { shadowRoot } = host;
  if (!shadowRoot) return;

  // Clean up previous smart-scroll listener.
  if (host.cleanupSmartScroll) {
    host.cleanupSmartScroll();
    host.cleanupSmartScroll = null;
  }

  // Clear previous content.
  clearShadowRoot(shadowRoot);

  const attr = host.getAttribute('position');
  const positionMode = VALID_POSITIONS.includes(attr) ? attr : 'sticky';

  // Combine shared CSS with inline nav CSS extracted from <style> tags.
  const rawCSS = [data.css, data.inlineCss].filter(Boolean).join('\n');
  if (rawCSS) {
    const { css, fontFaces } = processCSS(rawCSS);
    injectFontFaces(fontFaces);
    applyStyles(shadowRoot, buildShadowCSS(css, positionMode));
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = sanitizeHTML(data.html.nav);
  shadowRoot.appendChild(wrapper);

  // Clean up previous behaviour listeners.
  if (host.cleanupBehaviour) {
    host.cleanupBehaviour();
    host.cleanupBehaviour = null;
  }
  host.cleanupBehaviour = bindNavBehaviour(shadowRoot);

  if (positionMode === 'smart') {
    host.cleanupSmartScroll = bindSmartScroll(host);
  }
}

// ---- Custom element ----------------------------------------------------------

export class BitriseNavigation extends HTMLElement {
  static get observedAttributes() {
    return ['position'];
  }

  /**
   * Re-render when the `position` attribute changes at runtime.
   * @param {string} name - Attribute name.
   * @param {string|null} oldValue - Previous value.
   * @param {string|null} newValue - New value.
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'position' && oldValue !== newValue && this.shadowRoot && cachedData()) {
      renderNavigation(this, cachedData());
    }
  }

  /** Attach shadow root, register instance, render if data is ready. */
  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    connectedInstances.add(this);

    if (cachedData()) {
      renderNavigation(this, cachedData());
    }

    ensureLoader();
  }

  /** Clean up shadow content and shared resources. */
  disconnectedCallback() {
    if (this.cleanupBehaviour) {
      this.cleanupBehaviour();
      this.cleanupBehaviour = null;
    }
    if (this.cleanupSmartScroll) {
      this.cleanupSmartScroll();
      this.cleanupSmartScroll = null;
    }

    connectedInstances.delete(this);

    if (this.shadowRoot) {
      clearShadowRoot(this.shadowRoot);
    }

    cleanupFontsIfUnused();
  }
}

/**
 * Register the <bitrise-navigation> custom element and subscribe to
 * loader data. Must be called once by the entry point.
 */
export function init() {
  addDataListener((data) => {
    connectedInstances.forEach((el) => renderNavigation(el, data));
  });

  if (!customElements.get('bitrise-navigation')) {
    customElements.define('bitrise-navigation', BitriseNavigation);
  }
}
