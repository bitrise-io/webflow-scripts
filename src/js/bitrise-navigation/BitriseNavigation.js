import { detectEnv, LOADER_URLS } from './env';
import { renderNavigation } from './render';

/** All currently-connected <bitrise-navigation> elements. */
export const connectedInstances = new Set();

/** Cached payload from the loader script — shared across all instances. */
let cachedDataInternal = null;

/** @returns {object|null} */
export function cachedData() {
  return cachedDataInternal;
}

/**
 * Replace the cached data (used by HMR recovery).
 * @param {object|null} data
 */
export function setCachedData(data) {
  cachedDataInternal = data;
}

// ---- Custom element ----------------------------------------------------------

/** @type {typeof BitriseNavigation} */
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
    if (name === 'position' && oldValue !== newValue && this.shadowRoot && cachedDataInternal) {
      renderNavigation(this, cachedDataInternal);
    }
  }

  /** Attach shadow root, register instance, render if data is ready. */
  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    connectedInstances.add(this);

    if (cachedDataInternal) {
      renderNavigation(this, cachedDataInternal);
    }

    this.ensureLoader();
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

    // Remove font-face styles only when no instances remain.
    if (connectedInstances.size === 0) {
      document.querySelector('style[data-bitrise-navigation-fonts]')?.remove();
    }
  }

  /** Append the loader script to head (once globally). */
  ensureLoader() {
    if (document.querySelector('script[data-bitrise-navigation-loader]')) return;
    const env = detectEnv();
    const script = document.createElement('script');
    script.setAttribute('data-bitrise-navigation-loader', '');
    script.src = LOADER_URLS[env] || LOADER_URLS.production;
    document.head.appendChild(script);
  }
}

/**
 * Register the <bitrise-navigation> custom element and set up the global
 * loader callback. Must be called once by the entry point.
 */
export function init() {
  // Set up the global callback the loader script invokes with the payload.
  window.bitriseNavigationLoaded = (data) => {
    if (data.error) return;
    cachedDataInternal = data;
    connectedInstances.forEach((el) => renderNavigation(el, data));
  };

  // Register the custom element (idempotent).
  if (!customElements.get('bitrise-navigation')) {
    customElements.define('bitrise-navigation', BitriseNavigation);
  }
}
