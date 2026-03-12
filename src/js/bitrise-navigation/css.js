/**
 * Rewrite :root / body / html selectors to :host for shadow DOM use.
 * @param {string} text - CSS or HTML text.
 * @returns {string}
 */
export function rewriteGlobalSelectors(text) {
  return text
    .replace(/(^|[},;\s]):root(?=\s*[{,:])/gm, '$1:host')
    .replace(/(^|[},;\s])body(?=\s*[{,:])/gm, '$1:host')
    .replace(/(^|[},;\s])html(?=\s*[{,:])/gm, '$1:host');
}

/**
 * Parse raw CSS: rewrite global selectors and extract @font-face rules.
 * @param {string} rawCSS
 * @returns {{ css: string, fontFaces: string[] }}
 */
export function processCSS(rawCSS) {
  // Strip Webflow design-mode guard before generic rewrites — we're never
  // in design mode, so the :not() is always true and can be simplified.
  let css = rawCSS.replace(/html:not\(\.wf-design-mode\)/g, ':host');

  // Remove body/html overflow:hidden rules triggered by the mobile menu.
  // In shadow DOM this clips the overlay; we handle scroll-lock via JS
  // on document.body instead.
  css = css.replace(/body:has\([^)]*\.w-nav-button\.w--open[^)]*\)\s*\{[^}]*overflow:\s*hidden[^}]*\}/g, '');

  css = rewriteGlobalSelectors(css);

  const fontFaces = [];
  css = css.replace(/@font-face\s*{([^}]|\n)*}/g, (match) => {
    fontFaces.push(match);
    return '';
  });

  return { css, fontFaces };
}

/**
 * Inject @font-face rules into the document head (required outside shadow DOM).
 * @param {string[]} fontFaces
 */
export function injectFontFaces(fontFaces) {
  if (fontFaces.length === 0) return;
  document.querySelector('style[data-bitrise-navigation-fonts]')?.remove();
  const style = document.createElement('style');
  style.setAttribute('data-bitrise-navigation-fonts', '');
  style.textContent = fontFaces.join('\n');
  document.head.appendChild(style);
}

/**
 * Wrap processed CSS with :host reset and optional nav override rules.
 * @param {string} processedCSS
 * @param {'static'|'sticky'|'smart'|'footer'} positionMode
 * @returns {string}
 */
export function buildShadowCSS(processedCSS, positionMode = 'sticky') {
  const stickyRules = `
      position: sticky;
      top: 0;
      z-index: 9999;`;

  const positionRules = {
    footer: '',
    static: '',
    sticky: stickyRules,
    smart: `${stickyRules}\n      transition: transform 0.3s ease;`,
  };

  const navOverrides =
    positionMode !== 'footer'
      ? `
    .nav_main-flex-mobile,
    .nav_main-flex-img {
      z-index: 1;
    }
    .nav_main-content,
    .nav_highlights-wrapper {
      z-index: 2;
    }
    .w-dropdown-toggle[aria-expanded="true"] .nav_links_svg {
      transform: rotate(-180deg);
    }
    /* Override Webflow shared CSS that hides the mobile menu via data-collapse.
       Only show when JS has opened the menu (data-nav-menu-open attribute).
       This keeps the menu hidden when closed so it doesn't take flex space. */
    .w-nav-menu[data-nav-menu-open] {
      display: block !important;
    }
    /* Neutralise the default Webflow .w--open button style that
       overrides the custom hamburger design. */
    .w-nav-button.w--open {
      color: inherit;
      background-color: transparent;
    }
    /* The extracted CSS sets overflow:hidden on :host when the mobile menu
       is open, which clips the overlay. We handle scroll-lock via JS on
       document.body, so override this to keep the overlay visible. */
    :host:has(.nav_component .w-nav-button.w--open) {
      overflow: visible !important;
    }`
      : '';

  return `
    :host {
      all: initial;
      display: block;${positionRules[positionMode] || positionRules.sticky}
    }
    *, *::before, *::after {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      box-sizing: border-box;
    }
    ${processedCSS}${navOverrides}
  `;
}

/**
 * Strip script tags and rewrite global selectors in HTML.
 * @param {string} rawHTML
 * @returns {string}
 */
export function sanitizeHTML(rawHTML) {
  return rewriteGlobalSelectors(rawHTML.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''));
}

/**
 * Clear all content and stylesheets from a shadow root.
 * @param {ShadowRoot} root
 */
export function clearShadowRoot(root) {
  root.innerHTML = '';
  if ('adoptedStyleSheets' in Document.prototype) {
    root.adoptedStyleSheets = [];
  }
}

/**
 * Apply CSS to a shadow root, using adoptedStyleSheets when available.
 * @param {ShadowRoot} root
 * @param {string} css
 */
export function applyStyles(root, css) {
  if ('adoptedStyleSheets' in Document.prototype) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    root.adoptedStyleSheets = [sheet];
  } else {
    const style = document.createElement('style');
    style.textContent = css;
    root.appendChild(style);
  }
}
