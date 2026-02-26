import { cachedData, ensureLoader, addDataListener, cleanupFontsIfUnused } from './loader';
import { renderNavigation } from './renderNavigation';

/** All currently-connected <bitrise-navigation> elements. */
export const connectedInstances = new Set();

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
    if (this.cleanupSmartScroll) {
      this.cleanupSmartScroll();
      this.cleanupSmartScroll = null;
    }

    connectedInstances.delete(this);

    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = '';
      if ('adoptedStyleSheets' in Document.prototype) {
        this.shadowRoot.adoptedStyleSheets = [];
      }
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
