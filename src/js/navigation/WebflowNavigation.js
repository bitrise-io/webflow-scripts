import { detectEnv, LOADER_URLS } from './env';
import { renderNavigation } from './render';

/** All currently-connected <webflow-navigation> elements. */
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

/** @type {typeof WebflowNavigation} */
export class WebflowNavigation extends HTMLElement {
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
    connectedInstances.delete(this);

    if (this.shadowRoot) {
      this.shadowRoot.innerHTML = '';
      if ('adoptedStyleSheets' in Document.prototype) {
        this.shadowRoot.adoptedStyleSheets = [];
      }
    }

    // Remove font-face styles only when no instances remain.
    if (connectedInstances.size === 0) {
      document.querySelector('style[data-webflow-navigation-fonts]')?.remove();
    }
  }

  /** Append the loader script to head (once globally). */
  ensureLoader() {
    if (document.querySelector('script[data-webflow-navigation-loader]')) return;
    const env = detectEnv(this.getAttribute('env'));
    const script = document.createElement('script');
    script.setAttribute('data-webflow-navigation-loader', '');
    script.src = LOADER_URLS[env] || LOADER_URLS.production;
    document.head.appendChild(script);
  }
}

/**
 * Register the <webflow-navigation> custom element and set up the global
 * loader callback. Must be called once by the entry point.
 */
export function init() {
  // Set up the global callback the loader script invokes with the payload.
  window.webflowNavigationLoaded = (data) => {
    if (data.error) return;
    cachedDataInternal = data;
    connectedInstances.forEach((el) => renderNavigation(el, data));
  };

  // Register the custom element (idempotent).
  if (!customElements.get('webflow-navigation')) {
    customElements.define('webflow-navigation', WebflowNavigation);
  }
}
