import { cachedData, ensureLoader, addDataListener, cleanupFontsIfUnused } from './loader';
import { processCSS, injectFontFaces, buildShadowCSS, applyStyles, sanitizeHTML, clearShadowRoot } from './css';

/** All currently-connected <bitrise-footer> elements. */
export const connectedInstances = new Set();

// ---- Rendering --------------------------------------------------------------

/**
 * Render the footer HTML + CSS into a host element's shadow root.
 * @param {HTMLElement} host - A <bitrise-footer> element with an attached shadow root.
 * @param {{ html: { nav: string, footer: string }, css: string }} data - Payload from the loader script.
 */
export function renderFooter(host, data) {
  const { shadowRoot } = host;
  if (!shadowRoot) return;

  // Clear previous content.
  clearShadowRoot(shadowRoot);

  if (data.css) {
    const { css, fontFaces } = processCSS(data.css);
    injectFontFaces(fontFaces);
    applyStyles(shadowRoot, buildShadowCSS(css, 'footer'));
  }

  if (data.html.footer) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = sanitizeHTML(data.html.footer);
    shadowRoot.appendChild(wrapper);
  }
}

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
      clearShadowRoot(this.shadowRoot);
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
