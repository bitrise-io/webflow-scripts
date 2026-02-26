import { processCSS, injectFontFaces, buildShadowCSS, applyStyles } from './css';
import { sanitizeHTML } from './html';
import { bindNavBehaviour, bindSmartScroll } from './behaviour';

const VALID_POSITIONS = ['static', 'sticky', 'smart'];

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
  shadowRoot.innerHTML = '';
  if ('adoptedStyleSheets' in Document.prototype) {
    shadowRoot.adoptedStyleSheets = [];
  }

  const attr = host.getAttribute('position');
  const positionMode = VALID_POSITIONS.includes(attr) ? attr : 'sticky';

  if (data.css) {
    const { css, fontFaces } = processCSS(data.css);
    injectFontFaces(fontFaces);
    applyStyles(shadowRoot, buildShadowCSS(css, positionMode));
  }

  const wrapper = document.createElement('div');
  wrapper.innerHTML = sanitizeHTML(data.html.nav);
  shadowRoot.appendChild(wrapper);

  bindNavBehaviour(shadowRoot);

  if (positionMode === 'smart') {
    host.cleanupSmartScroll = bindSmartScroll(host);
  }
}
