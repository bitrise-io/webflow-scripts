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
