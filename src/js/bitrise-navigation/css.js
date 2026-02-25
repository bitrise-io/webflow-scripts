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
  let css = rewriteGlobalSelectors(rawCSS);

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
 * Wrap processed CSS with :host reset and override rules.
 * @param {string} processedCSS
 * @param {'static'|'sticky'|'smart'} positionMode
 * @returns {string}
 */
export function buildShadowCSS(processedCSS, positionMode = 'sticky') {
  const stickyRules = `
      position: sticky;
      top: 0;
      z-index: 9999;`;

  const positionRules = {
    static: '',
    sticky: stickyRules,
    smart: `${stickyRules}\n      transition: transform 0.3s ease;`,
  };

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
    ${processedCSS}
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
  `;
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
