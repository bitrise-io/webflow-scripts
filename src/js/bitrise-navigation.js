// ---------------------------------------------------------------------------
// <bitrise-navigation> + <bitrise-footer> custom elements — entry point
//
// Usage:  <bitrise-navigation></bitrise-navigation>
//         <bitrise-navigation position="smart"></bitrise-navigation>
//         <bitrise-footer></bitrise-footer>
//
// All logic lives in src/js/bitrise-navigation/*.js — this file only
// re-exports the custom element registrations and handles webpack HMR.
// ---------------------------------------------------------------------------

import { cachedData, setCachedData, initLoader } from './bitrise-navigation/loader';
import { connectedInstances as navInstances, init as initNav } from './bitrise-navigation/BitriseNavigation';
import { connectedInstances as footerInstances, init as initFooter } from './bitrise-navigation/BitriseFooter';
import { renderNavigation } from './bitrise-navigation/renderNavigation';
import { renderFooter } from './bitrise-navigation/renderFooter';

// Initialise the shared loader (global callback + script injection).
initLoader();

// Register both custom elements and subscribe to loader data.
initNav();
initFooter();

if (import.meta.webpackHot) {
  // Recover data cached by the previous module version.
  if (window.webflowNavHMRData) {
    setCachedData(window.webflowNavHMRData);
    delete window.webflowNavHMRData;

    // Re-render existing nav instances.
    document.querySelectorAll('bitrise-navigation').forEach((el) => {
      if (el.isConnected && el.shadowRoot) {
        navInstances.add(el);
        renderNavigation(el, cachedData());
      }
    });

    // Re-render existing footer instances.
    document.querySelectorAll('bitrise-footer').forEach((el) => {
      if (el.isConnected && el.shadowRoot) {
        footerInstances.add(el);
        renderFooter(el, cachedData());
      }
    });
  }

  import.meta.webpackHot.dispose(() => {
    // Persist data across HMR cycles.
    window.webflowNavHMRData = cachedData();

    // Clean up shadow roots.
    document.querySelectorAll('bitrise-navigation, bitrise-footer').forEach((el) => {
      if (el.shadowRoot) {
        el.shadowRoot.innerHTML = '';
        if ('adoptedStyleSheets' in Document.prototype) {
          el.shadowRoot.adoptedStyleSheets = [];
        }
      }
    });

    document.querySelector('style[data-bitrise-navigation-fonts]')?.remove();
    document.querySelector('script[data-bitrise-navigation-loader]')?.remove();
  });

  import.meta.webpackHot.accept();
}
