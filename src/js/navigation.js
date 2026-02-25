console.log('Webflow Navigation Loader');
window.webflowNavigationLoaded = (data) => {
  console.log('Webflow Navigation Loaded', data);
  const navContainer = document.querySelector('#webflow-navigation-container');
  if (!navContainer) {
    console.error('Navigation container not found');
    return;
  }

  if (data.error) {
    console.error('Error loading navigation:', data.error);
    return;
  }

  if (data.css) {
    const style = document.createElement('style');
    style.setAttribute('data-webflow-navigation', '');
    let css = data.css.replace(/:root\s*{/g, '& {').replace(/body\s*{/g, '& {');
    css = `#webflow-navigation-container {
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
    .replace(/<style[^>]*>(.*?)<\/style>/gis, `<style>#webflow-navigation-container { $1 }</style>`)
    .replace(/:root\s*{/g, '& {')
    .replace(/body\s*{/g, '& {');

  navContainer.innerHTML = data.html;

  document.querySelectorAll('#webflow-navigation-container .nav_dropdown_component.w-dropdown').forEach((dropdown) => {
    dropdown.addEventListener('mouseenter', () => {
      dropdown.querySelector('.navdropdown_mega-wrapper').style.transition = 'height 0.5s ease, opacity 0.5s ease';
      dropdown.querySelector('.navdropdown_mega-wrapper').style.opacity = 0;
      dropdown.querySelector('nav.w-dropdown-list').classList.toggle('w--open');
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
    });
    dropdown.addEventListener('mouseleave', () => {
      dropdown.querySelector('nav.w-dropdown-list').classList.toggle('w--open');
    });
  });
};
const webflowNavigationLoader = document.createElement('script');
document.head.appendChild(webflowNavigationLoader);
webflowNavigationLoader.src = '/navigation_loader.js';

const resetScripts = [];
resetScripts.push(() => {
  const navContainer = document.querySelector('#webflow-navigation-container');
  if (navContainer) {
    navContainer.innerHTML = '';
  }
  const style = document.querySelector('style[data-webflow-navigation]');
  if (style) {
    style.remove();
  }
});

if (import.meta.webpackHot) {
  import.meta.webpackHot.dispose(() => {
    resetScripts.forEach((resetScript) => {
      resetScript();
    });
  });
  import.meta.webpackHot.accept();
}
