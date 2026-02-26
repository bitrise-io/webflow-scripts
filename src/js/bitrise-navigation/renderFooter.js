import { processCSS, injectFontFaces, applyStyles } from './css';
import { sanitizeHTML } from './html';

/**
 * Build footer-specific shadow CSS — just the :host reset and font smoothing.
 * No sticky positioning or nav-specific z-index overrides.
 * @param {string} processedCSS
 * @returns {string}
 */
function buildFooterShadowCSS(processedCSS) {
  return `
    :host {
      all: initial;
      display: block;
    }
    *, *::before, *::after {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      box-sizing: border-box;
    }
    ${processedCSS}
  `;
}

/**
 * Render the footer HTML + CSS into a host element's shadow root.
 * @param {HTMLElement} host - A <bitrise-footer> element with an attached shadow root.
 * @param {{ html: { nav: string, footer: string }, css: string }} data - Payload from the loader script.
 */
export function renderFooter(host, data) {
  const { shadowRoot } = host;
  if (!shadowRoot) return;

  // Clear previous content.
  shadowRoot.innerHTML = '';
  if ('adoptedStyleSheets' in Document.prototype) {
    shadowRoot.adoptedStyleSheets = [];
  }

  if (data.css) {
    const { css, fontFaces } = processCSS(data.css);
    injectFontFaces(fontFaces);
    applyStyles(shadowRoot, buildFooterShadowCSS(css));
  }

  if (data.html.footer) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = sanitizeHTML(data.html.footer);
    shadowRoot.appendChild(wrapper);
  }
}
