// ---------------------------------------------------------------------------
// Behaviour — CSS-first approach
//
// The Webflow nav CSS handles ALL animations via :has() selectors,
// grid-template-rows transitions, and clip-path keyframes.
// This JS only toggles state: classes and aria-expanded attributes.
// ---------------------------------------------------------------------------

const MOBILE_MQ = '(max-width: 1115px)';

// ---------------------------------------------------------------------------
// Dropdowns
// ---------------------------------------------------------------------------

/**
 * Set a dropdown's open/closed state.
 * @param {Element} dropdown - A .nav_dropdown_component element
 * @param {boolean} open
 */
function setDropdownOpen(dropdown, open) {
  const toggle = dropdown.querySelector('.w-dropdown-toggle');
  if (!toggle) return;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.classList.toggle('w--open', open);
  dropdown.querySelector('.w-dropdown-list')?.classList.toggle('w--open', open);
}

/**
 * Close every open dropdown in the shadow root.
 * @param {ShadowRoot} root
 */
function closeAllDropdowns(root) {
  root.querySelectorAll('.nav_dropdown_component.w-dropdown').forEach((d) => setDropdownOpen(d, false));
}

/**
 * Bind hover (desktop) and click (mobile) listeners on all dropdowns.
 * @param {ShadowRoot} root
 * @returns {() => void} cleanup function
 */
function bindDropdowns(root) {
  const mql = window.matchMedia(MOBILE_MQ);
  const dropdowns = root.querySelectorAll('.nav_dropdown_component.w-dropdown');
  const controllers = [];

  dropdowns.forEach((dropdown) => {
    const ac = new AbortController();
    controllers.push(ac);
    const toggle = dropdown.querySelector('.w-dropdown-toggle');
    if (!toggle) return;

    // Desktop: hover
    dropdown.addEventListener(
      'mouseenter',
      () => {
        if (mql.matches) return;
        closeAllDropdowns(root);
        setDropdownOpen(dropdown, true);
      },
      { signal: ac.signal },
    );

    dropdown.addEventListener(
      'mouseleave',
      () => {
        if (mql.matches) return;
        setDropdownOpen(dropdown, false);
      },
      { signal: ac.signal },
    );

    // Mobile: click (only when mobile menu is open)
    toggle.addEventListener(
      'click',
      (e) => {
        if (!mql.matches) return;
        e.preventDefault();
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        setDropdownOpen(dropdown, !isOpen);
      },
      { signal: ac.signal },
    );
  });

  return () => controllers.forEach((ac) => ac.abort());
}

// ---------------------------------------------------------------------------
// Mobile menu
// ---------------------------------------------------------------------------

/**
 * Bind the mobile hamburger toggle button.
 * CSS handles clip-path animation and hamburger line transforms.
 * JS only toggles .w--open and manages body scroll lock.
 * @param {ShadowRoot} root
 * @returns {() => void} cleanup function
 */
function bindMobileMenu(root) {
  const toggle = root.querySelector('.w-nav-button');
  const menu = root.querySelector('.w-nav-menu');
  const nav = root.querySelector('.nav_component');
  if (!toggle || !menu) return () => {};

  // Webflow JS creates .w-nav-overlay dynamically; we do the same.
  let overlay = root.querySelector('.w-nav-overlay');
  if (!overlay && nav) {
    overlay = document.createElement('div');
    overlay.className = 'w-nav-overlay';
    overlay.setAttribute('data-wf-ignore', '');
    nav.appendChild(overlay);
  }

  const ac = new AbortController();
  /** The original parent and next sibling so we can move the menu back. */
  const menuParent = menu.parentNode;
  const menuNextSibling = menu.nextSibling;

  // Hamburger line elements for inline transforms (matching original Webflow JS).
  const lines = toggle.querySelectorAll('.nav_btn_line');
  const topLine = lines[0];
  const midLine = lines[1];
  const botLine = lines[2];

  /**
   * Apply transforms to hamburger lines to match the open/closed state.
   * @param {boolean} open - Whether the menu is open, which determines the transform applied.
   */
  function setHamburgerState(open) {
    if (topLine) {
      topLine.style.transform = open
        ? 'translate3d(0px, 0.425rem, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(45deg) skew(0deg, 0deg)'
        : '';
      topLine.style.transformStyle = open ? 'preserve-3d' : '';
    }
    if (midLine) {
      midLine.style.opacity = open ? '0' : '';
    }
    if (botLine) {
      botLine.style.transform = open
        ? 'translate3d(0px, -0.425rem, 0px) scale3d(1, 1, 1) rotateX(0deg) rotateY(0deg) rotateZ(-45deg) skew(0deg, 0deg)'
        : '';
      botLine.style.transformStyle = open ? 'preserve-3d' : '';
    }
  }

  /**
   * Set the menu open or closed.
   * @param {boolean} open - Whether the menu should be open.
   */
  function setMenuOpen(open) {
    toggle.classList.toggle('w--open', open);
    toggle.setAttribute('aria-expanded', String(open));
    setHamburgerState(open);

    if (open) {
      // Move menu into overlay (like original Webflow JS).
      if (overlay) {
        overlay.style.display = 'block';
        overlay.style.height = `${document.documentElement.scrollHeight}px`;
        overlay.appendChild(menu);
        menu.setAttribute('data-nav-menu-open', '');
      }
      document.body.style.overflow = 'hidden';
    } else {
      closeAllDropdowns(root);
      // Move menu back to original position.
      if (overlay) {
        menu.removeAttribute('data-nav-menu-open');
        if (menuNextSibling) {
          menuParent.insertBefore(menu, menuNextSibling);
        } else {
          menuParent.appendChild(menu);
        }
        overlay.style.display = '';
        overlay.style.height = '';
      }
      document.body.style.overflow = '';
    }
  }

  toggle.addEventListener(
    'click',
    () => {
      setMenuOpen(!toggle.classList.contains('w--open'));
    },
    { signal: ac.signal },
  );

  return () => {
    ac.abort();
    setMenuOpen(false);
  };
}

// ---------------------------------------------------------------------------
// Smart scroll (hide on scroll-down, reveal on scroll-up)
// ---------------------------------------------------------------------------

/**
 * Bind a scroll listener that hides the host on scroll-down and reveals it
 * on scroll-up.  Returns a cleanup function.
 * @param {HTMLElement} host - The <bitrise-navigation> custom element.
 * @returns {() => void}
 */
export function bindSmartScroll(host) {
  let lastScrollY = window.scrollY;
  let hidden = false;
  const THRESHOLD = 5; // px of delta before toggling

  /** Scroll handler — compares delta to threshold and toggles visibility. */
  function onScroll() {
    const currentY = window.scrollY;
    const delta = currentY - lastScrollY;

    if (delta > THRESHOLD && currentY > host.offsetHeight && !hidden) {
      host.style.transform = 'translateY(-100%)';
      hidden = true;
    } else if (delta < -THRESHOLD && hidden) {
      host.style.transform = '';
      hidden = false;
    }

    lastScrollY = currentY;
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', onScroll);
    host.style.transform = '';
  };
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

/**
 * Wire up dropdown and mobile-menu interactions inside the shadow root.
 * Returns a cleanup function that removes all listeners and restores state.
 * @param {ShadowRoot} root
 * @returns {() => void}
 */
export function bindNavBehaviour(root) {
  const cleanupDropdowns = bindDropdowns(root);
  const cleanupMobile = bindMobileMenu(root);

  return () => {
    cleanupDropdowns();
    cleanupMobile();
  };
}
