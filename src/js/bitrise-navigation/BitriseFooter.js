import { cachedData, ensureLoader, addDataListener, cleanupFontsIfUnused } from './loader';
import { renderFooter } from './renderFooter';

/** All currently-connected <bitrise-footer> elements. */
export const connectedInstances = new Set();

// ---- Custom element ----------------------------------------------------------

export class BitriseFooter extends HTMLElement {
  /** Attach shadow root, register instance, render if data is ready. */
  connectedCallback() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
    connectedInstances.add(this);

    if (cachedData()) {
      renderFooter(this, cachedData());
    }

    ensureLoader();
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

    cleanupFontsIfUnused();
  }
}

/**
 * Register the <bitrise-footer> custom element and subscribe to
 * loader data. Must be called once by the entry point.
 */
export function init() {
  addDataListener((data) => {
    connectedInstances.forEach((el) => renderFooter(el, data));
  });

  if (!customElements.get('bitrise-footer')) {
    customElements.define('bitrise-footer', BitriseFooter);
  }
}
