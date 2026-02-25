const loadWebflowNavigation = () => {
  let env = 'production';
  const queryEnv = window.location.search.match(/env=(\w+)/);
  if (queryEnv && queryEnv[1] === 'development') {
    env = 'development';
  }
  if (window.location.host === 'localhost' || window.location.host === '127.0.0.1') {
    env = 'development';
  }

  const NAV_CONTAINER_ID = 'webflow-navigation-container';
  let navContainer;

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

    if (data.css) {
      const style = document.createElement('style');
      style.setAttribute('data-webflow-navigation', '');
      let css = data.css.replace(/:root\s*{/g, '& {').replace(/body\s*{/g, '& {');
      css = `#${NAV_CONTAINER_ID} {
        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
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
      }`;
      const fontFaces = css.match(/@font-face\s*{[^}]*}/g);
      if (fontFaces) {
        fontFaces.forEach((fontFace) => {
          css = css.replace(fontFace, '') + fontFace;
        });
      }

      style.textContent = css;
      document.head.appendChild(style);
    }

    data.html = data.html
      .replace(/<style[^>]*>(.*?)<\/style>/gis, `<style>#${NAV_CONTAINER_ID} { $1 }</style>`)
      .replace(/:root\s*{/g, '& {')
      .replace(/body\s*{/g, '& {');

    navContainer.innerHTML = data.html;

    const navMobileToggle = document.querySelector(`#${NAV_CONTAINER_ID} .w-nav-button`);
    const navMenu = document.querySelector(`#${NAV_CONTAINER_ID} .w-nav-menu`);
    let navOverlay = document.querySelector(`#${NAV_CONTAINER_ID} .w-nav-overlay`);
    if (!navOverlay) {
      navOverlay = document.createElement('div');
      navOverlay.className = 'w-nav-overlay';
      navOverlay.style.display = 'none';
      navMobileToggle.insertAdjacentElement('afterend', navOverlay);
    }

    const openNavDropdown = (dropdown) => {
      dropdown.querySelector('.w-dropdown-toggle').setAttribute('aria-expanded', 'true');
      navContainer.querySelector('.nav_dropdown_backdrop').style.opacity = 1;
      dropdown.querySelector('.navdropdown_mega-wrapper').style.transition = 'height 0.5s ease, opacity 0.5s ease';
      dropdown.querySelector('.navdropdown_mega-wrapper').style.opacity = 0;
      dropdown.querySelector('nav.w-dropdown-list').classList.add('w--open');
      requestAnimationFrame(() => {
        const dropdownHeight = dropdown.querySelector('.navdropdown_mega-wrapper').clientHeight;
        dropdown.querySelector('.navdropdown_mega-wrapper').style.height = 0;
        requestAnimationFrame(() => {
          dropdown.querySelector('.navdropdown_mega-wrapper').style.height = `${dropdownHeight}px`;
          dropdown.querySelector('.navdropdown_mega-wrapper').style.opacity = 1;
          window.setTimeout(() => {
            dropdown.querySelector('.navdropdown_mega-wrapper').style.height = '';
            dropdown.querySelector('.navdropdown_mega-wrapper').style.opacity = '';
          }, 500);
        });
      });
    };

    const closeNavDropdown = (dropdown) => {
      dropdown.querySelector('.w-dropdown-toggle').removeAttribute('aria-expanded');
      dropdown.querySelector('nav.w-dropdown-list').classList.remove('w--open');
      navContainer.querySelector('.nav_dropdown_backdrop').style.opacity = 0;
    };

    document.querySelectorAll(`#${NAV_CONTAINER_ID} .nav_dropdown_component.w-dropdown`).forEach((dropdown) => {
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
      navMobileToggle.querySelector('.nav_btn_line.is-top').style.transformStyle = 'preserve-3d';
      navMobileToggle.querySelector('.nav_btn_line.is-bottom').style.transformStyle = 'preserve-3d';
      navMobileToggle.addEventListener('click', () => {
        if (!navMobileToggle.classList.contains('w--open')) {
          navMobileToggle.classList.add('w--open');
          navMobileToggle.querySelector('.nav_btn_line.is-top').style.transform =
            'translate3d(0px, 0.425rem, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(45deg) skew(0deg, 0deg)';
          navMobileToggle.querySelector('.nav_btn_line.is-middle').style.opacity = 0;
          navMobileToggle.querySelector('.nav_btn_line.is-bottom').style.transform =
            'translate3d(0px, -0.425rem, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(-45deg) skew(0deg, 0deg)';
          navOverlay.appendChild(navMenu);
          navMenu.setAttribute('data-nav-menu-open', 'true');
          navOverlay.style.display = 'block';
          const navMenuHeight = navMenu.clientHeight;
          navMenu.style.height = 0;
          navMenu.style.overflow = 'hidden';
          navMenu.style.transition = 'height 0.5s ease';
          requestAnimationFrame(() => {
            navMenu.style.height = `${navMenuHeight}px`;
            window.setTimeout(() => {
              navMenu.style.height = '';
            }, 500);
          });
        } else {
          navMobileToggle.classList.remove('w--open');
          navMobileToggle.querySelector('.nav_btn_line.is-top').style.transform =
            'translate3d(0px, 0rem, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)';
          navMobileToggle.querySelector('.nav_btn_line.is-middle').style.opacity = 1;
          navMobileToggle.querySelector('.nav_btn_line.is-bottom').style.transform =
            'translate3d(0px, 0rem, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(0deg) skew(0deg, 0deg)';
          navMobileToggle.insertAdjacentElement('beforebegin', navMenu);
          navOverlay.style.display = 'none';
          navMenu.removeAttribute('data-nav-menu-open');
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
      }
      if (webflowNavigationLoader) {
        webflowNavigationLoader.remove();
      }
      if (window.webflowNavigationLoaded) {
        delete window.webflowNavigationLoaded;
      }
      const style = document.querySelector('style[data-webflow-navigation]');
      if (style) {
        style.remove();
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
