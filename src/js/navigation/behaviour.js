// ---------------------------------------------------------------------------
// Dropdowns
// ---------------------------------------------------------------------------

/**
 * Animate-open a single dropdown.
 * @param {ShadowRoot} root
 * @param {Element} dropdown
 * @param {number} animationDuration
 */
function openNavDropdown(root, dropdown, animationDuration = 500) {
  dropdown.querySelector('.w-dropdown-toggle')?.setAttribute('aria-expanded', 'true');
  const backdrop = root.querySelector('.nav_dropdown_backdrop');
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
}

/**
 * Close a single dropdown immediately.
 * @param {ShadowRoot} root
 * @param {Element} dropdown
 */
function closeNavDropdown(root, dropdown) {
  dropdown.querySelector('.w-dropdown-toggle')?.removeAttribute('aria-expanded');
  dropdown.querySelector('nav.w-dropdown-list')?.classList.remove('w--open');
  const backdrop = root.querySelector('.nav_dropdown_backdrop');
  if (backdrop) backdrop.style.opacity = 0;
}

/**
 * Bind hover / click listeners on all dropdowns in the shadow root.
 * @param {ShadowRoot} root
 * @param {Element} navMenu
 */
function bindDropdowns(root, navMenu) {
  root.querySelectorAll('.nav_dropdown_component.w-dropdown').forEach((dropdown) => {
    dropdown.addEventListener('mouseenter', () => {
      if (navMenu.hasAttribute('data-nav-menu-open')) return;
      openNavDropdown(root, dropdown);
    });
    dropdown.addEventListener('mouseleave', () => {
      if (navMenu.hasAttribute('data-nav-menu-open')) return;
      closeNavDropdown(root, dropdown);
    });
    dropdown.querySelector('.w-dropdown-toggle')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!navMenu.hasAttribute('data-nav-menu-open')) return;
      if (dropdown.querySelector('nav.w-dropdown-list')?.classList.contains('w--open')) {
        closeNavDropdown(root, dropdown);
      } else {
        openNavDropdown(root, dropdown);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Mobile menu
// ---------------------------------------------------------------------------

/**
 * Update hamburger line transforms.
 * @param {Element} toggle
 * @param {boolean} open
 */
function transformMobileToggle(toggle, open) {
  const lineTop = toggle.querySelector('.nav_btn_line.is-top');
  const lineMiddle = toggle.querySelector('.nav_btn_line.is-middle');
  const lineBottom = toggle.querySelector('.nav_btn_line.is-bottom');
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
}

/**
 * Animate-open the mobile nav menu.
 * @param {Element} toggle
 * @param {Element} navMenu
 * @param {Element} navOverlay
 * @param {number} animationDuration
 */
function openNavMenu(toggle, navMenu, navOverlay, animationDuration = 500) {
  toggle.classList.add('w--open');
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
}

/**
 * Close the mobile nav menu.
 * @param {Element} toggle
 * @param {Element} navMenu
 * @param {Element} navOverlay
 */
function closeNavMenu(toggle, navMenu, navOverlay) {
  toggle.classList.remove('w--open');
  toggle.insertAdjacentElement('beforebegin', navMenu);
  navOverlay.style.display = 'none';
  navMenu.removeAttribute('data-nav-menu-open');
}

/**
 * Bind the mobile hamburger toggle button.
 * @param {Element} toggle
 * @param {Element} navMenu
 * @param {Element} navOverlay
 */
function bindMobileToggle(toggle, navMenu, navOverlay) {
  toggle.addEventListener('click', () => {
    if (!toggle.classList.contains('w--open')) {
      transformMobileToggle(toggle, true);
      openNavMenu(toggle, navMenu, navOverlay);
    } else {
      transformMobileToggle(toggle, false);
      closeNavMenu(toggle, navMenu, navOverlay);
    }
  });
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

/**
 * Wire up dropdown, mobile-menu, and hamburger interactions inside the shadow root.
 * @param {ShadowRoot} root
 */
export function bindNavBehaviour(root) {
  const navMobileToggle = root.querySelector('.w-nav-button');
  const navMenu = root.querySelector('.w-nav-menu');
  if (!navMobileToggle || !navMenu) return;

  let navOverlay = root.querySelector('.w-nav-overlay');
  if (!navOverlay) {
    navOverlay = document.createElement('div');
    navOverlay.className = 'w-nav-overlay';
    navOverlay.style.display = 'none';
    navMobileToggle.insertAdjacentElement('afterend', navOverlay);
  }

  bindDropdowns(root, navMenu);
  bindMobileToggle(navMobileToggle, navMenu, navOverlay);
}
