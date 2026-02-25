import { processCSS, injectFontFaces, buildShadowCSS, applyStyles } from './css';
import { sanitizeHTML } from './html';
import { bindNavBehaviour } from './behaviour';

/**
 * Render the navigation HTML + CSS into a host element's shadow root.
 * @param {HTMLElement} host - A <webflow-navigation> element with an attached shadow root.
 * @param {{ html: string, css: string }} data - Payload from the loader script.
 */
export function renderNavigation(host, data) {
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
    applyStyles(shadowRoot, buildShadowCSS(css));
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = sanitizeHTML(data.html);
  shadowRoot.appendChild(wrapper);

  bindNavBehaviour(shadowRoot);
}
