const loadWebflowNavigation = () => {
  let env = 'production';
  const queryEnv = window.location.search.match(/env=(\w+)/);
  if (queryEnv && queryEnv[1] === 'development') {
    env = 'development';
  }
  if (window.location.host.startsWith('localhost') || window.location.host.startsWith('127.0.0.1')) {
    env = 'development';
  }

  console.log('env:', env, window.location.host);

  const NAV_CONTAINER_ID = 'webflow-navigation-container';
  let navContainer;
  let shadowRoot;

  window.webflowNavigationLoaded = (data) => {
    navContainer = document.querySelector(`#${NAV_CONTAINER_ID}`);
    if (!navContainer) {
      // console.error('Navigation container not found');
      return;
    }

    if (data.error) {
      // console.error('Error loading navigation:', data.error);
      return;
    }

    // Use Shadow DOM for CSS isolation — styles stay flat (no nested selector block)
    // which keeps DevTools responsive, and they can't leak to the host page.
    // Guard against double initialization (attachShadow throws if called twice).
    if (navContainer.shadowRoot) {
      navContainer.shadowRoot.innerHTML = '';
      shadowRoot = navContainer.shadowRoot;
    } else {
      shadowRoot = navContainer.attachShadow({ mode: 'open' });
    }

    if (data.css) {
      // Rewrite global selectors to :host — use word-boundary-aware patterns
      // to avoid mangling class names like "body-text" or "html-embed".
      let css = data.css
        .replace(/(^|[},;\s]):root(?=\s*[{,:])/gm, '$1:host')
        .replace(/(^|[},;\s])body(?=\s*[{,:])/gm, '$1:host')
        .replace(/(^|[},;\s])html(?=\s*[{,:])/gm, '$1:host');

      // Extract @font-face rules — they must live in the document head
      // to work reliably across browsers.
      // Use a balanced-brace approach to handle multi-line src descriptors.
      const fontFaces = [];
      css = css.replace(/@font-face\s*{([^}]|\n)*}/g, (match) => {
        fontFaces.push(match);
        return '';
      });
      if (fontFaces.length > 0) {
        // Remove any previously injected font-face style to avoid duplicates on HMR.
        document.querySelector('style[data-webflow-navigation-fonts]')?.remove();
        const fontStyle = document.createElement('style');
        fontStyle.setAttribute('data-webflow-navigation-fonts', '');
        fontStyle.textContent = fontFaces.join('\n');
        document.head.appendChild(fontStyle);
      }

      css = `
        :host {
          all: initial;
          display: block;
        }
        *, *::before, *::after {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          box-sizing: border-box;
        }
        ${css}
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

      // Use adoptedStyleSheets when available — the browser parses the CSS once
      // and shares the CSSStyleSheet object, which is faster and uses less memory
      // than a <style> element for large stylesheets.
      if ('adoptedStyleSheets' in Document.prototype) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(css);
        shadowRoot.adoptedStyleSheets = [sheet];
      } else {
        const style = document.createElement('style');
        style.textContent = css;
        shadowRoot.appendChild(style);
      }
    }

    // Sanitize HTML: remove <script> tags to prevent unexpected code execution,
    // and rewrite inline <style> selectors for :root/body/html → :host.
    const safeHTML = data.html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/(^|[},;\s]):root(?=\s*[{,:])/gm, '$1:host')
      .replace(/(^|[},;\s])body(?=\s*[{,:])/gm, '$1:host')
      .replace(/(^|[},;\s])html(?=\s*[{,:])/gm, '$1:host');

    const wrapper = document.createElement('div');
    wrapper.innerHTML = safeHTML;
    shadowRoot.appendChild(wrapper);

    const navMobileToggle = shadowRoot.querySelector('.w-nav-button');
    const navMenu = shadowRoot.querySelector('.w-nav-menu');
    if (!navMobileToggle || !navMenu) {
      // Navigation structure is incomplete — skip interactive setup.
      return;
    }
    let navOverlay = shadowRoot.querySelector('.w-nav-overlay');
    if (!navOverlay) {
      navOverlay = document.createElement('div');
      navOverlay.className = 'w-nav-overlay';
      navOverlay.style.display = 'none';
      navMobileToggle.insertAdjacentElement('afterend', navOverlay);
    }

    const openNavDropdown = (dropdown, animationDuration = 500) => {
      dropdown.querySelector('.w-dropdown-toggle')?.setAttribute('aria-expanded', 'true');
      const backdrop = shadowRoot.querySelector('.nav_dropdown_backdrop');
      if (backdrop) backdrop.style.opacity = 1;
      const megaWrapper = dropdown.querySelector('.navdropdown_mega-wrapper');
      const dropdownList = dropdown.querySelector('nav.w-dropdown-list');
      if (!megaWrapper || !dropdownList) return;
      megaWrapper.style.transition = `height ${animationDuration}ms ease, opacity ${animationDuration}ms ease`;
      megaWrapper.style.opacity = 0;
      dropdownList.classList.add('w--open');
      requestAnimationFrame(() => {
        const dropdownHeight = megaWrapper.clientHeight;
        megaWrapper.style.height = 0;
        requestAnimationFrame(() => {
          megaWrapper.style.height = `${dropdownHeight}px`;
          megaWrapper.style.opacity = 1;
          window.setTimeout(() => {
            megaWrapper.style.height = '';
            megaWrapper.style.opacity = '';
          }, animationDuration);
        });
      });
    };

    const closeNavDropdown = (dropdown) => {
      dropdown.querySelector('.w-dropdown-toggle')?.removeAttribute('aria-expanded');
      dropdown.querySelector('nav.w-dropdown-list')?.classList.remove('w--open');
      const backdrop = shadowRoot.querySelector('.nav_dropdown_backdrop');
      if (backdrop) backdrop.style.opacity = 0;
    };

    const transformMobileToggle = (open) => {
      const lineTop = navMobileToggle.querySelector('.nav_btn_line.is-top');
      const lineMiddle = navMobileToggle.querySelector('.nav_btn_line.is-middle');
      const lineBottom = navMobileToggle.querySelector('.nav_btn_line.is-bottom');
      if (!lineTop || !lineMiddle || !lineBottom) return;
      lineTop.style.transformStyle = 'preserve-3d';
      lineBottom.style.transformStyle = 'preserve-3d';
      if (open) {
        lineTop.style.transform =
          'translate3d(0px, 0.425rem, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(45deg) skew(0deg, 0deg)';
        lineMiddle.style.opacity = 0;
        lineBottom.style.transform =
          'translate3d(0px, -0.425rem, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(-45deg) skew(0deg, 0deg)';
      } else {
        lineTop.style.transform =
          'translate3d(0px, 0rem, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)';
        lineMiddle.style.opacity = 1;
        lineBottom.style.transform =
          'translate3d(0px, 0rem, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)';
      }
    };

    const openNavMenu = (animationDuration = 500) => {
      navMobileToggle.classList.add('w--open');
      navOverlay.appendChild(navMenu);
      navMenu.setAttribute('data-nav-menu-open', 'true');
      navOverlay.style.display = 'block';
      navOverlay.style.top = '100%';
      const navMenuHeight = navMenu.clientHeight;
      navMenu.style.height = 0;
      navMenu.style.overflow = 'hidden';
      navMenu.style.transition = `height ${animationDuration}ms ease`;
      requestAnimationFrame(() => {
        navMenu.style.height = `${navMenuHeight}px`;
        window.setTimeout(() => {
          navMenu.style.height = '';
        }, animationDuration);
      });
    };

    const closeNavMenu = () => {
      navMobileToggle.classList.remove('w--open');
      navMobileToggle.insertAdjacentElement('beforebegin', navMenu);
      navOverlay.style.display = 'none';
      navMenu.removeAttribute('data-nav-menu-open');
    };

    shadowRoot.querySelectorAll('.nav_dropdown_component.w-dropdown').forEach((dropdown) => {
      dropdown.addEventListener('mouseenter', () => {
        if (navMenu.hasAttribute('data-nav-menu-open')) return;
        openNavDropdown(dropdown);
      });
      dropdown.addEventListener('mouseleave', () => {
        if (navMenu.hasAttribute('data-nav-menu-open')) return;
        closeNavDropdown(dropdown);
      });
      dropdown.querySelector('.w-dropdown-toggle').addEventListener('click', (e) => {
        e.preventDefault();
        if (!navMenu.hasAttribute('data-nav-menu-open')) return;
        if (dropdown.querySelector('nav.w-dropdown-list').classList.contains('w--open')) {
          closeNavDropdown(dropdown);
        } else {
          openNavDropdown(dropdown);
        }
      });
    });

    if (navMobileToggle) {
      navMobileToggle.addEventListener('click', () => {
        if (!navMobileToggle.classList.contains('w--open')) {
          transformMobileToggle(true);
          openNavMenu();
        } else {
          transformMobileToggle(false);
          closeNavMenu();
        }
      });
    }
  };

  const webflowNavigationLoader = document.createElement('script');
  document.head.appendChild(webflowNavigationLoader);
  webflowNavigationLoader.src =
    env === 'development' ? '/navigation_loader.js' : 'https://web-cdn.bitrise.io/navigation_loader.js';

  return {
    el: navContainer,
    reset: () => {
      if (navContainer) {
        navContainer.innerHTML = '';
        shadowRoot = null;
      }
      if (webflowNavigationLoader) {
        webflowNavigationLoader.remove();
      }
      if (window.webflowNavigationLoaded) {
        delete window.webflowNavigationLoaded;
      }
      const fontStyle = document.querySelector('style[data-webflow-navigation-fonts]');
      if (fontStyle) {
        fontStyle.remove();
      }
    },
  };
};

const webflowNavigation = loadWebflowNavigation();

if (import.meta.webpackHot) {
  import.meta.webpackHot.dispose(() => {
    if (webflowNavigation) webflowNavigation.reset();
  });
  import.meta.webpackHot.accept();
}
