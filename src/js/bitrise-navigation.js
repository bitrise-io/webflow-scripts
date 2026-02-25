// ---------------------------------------------------------------------------
// <bitrise-navigation> custom element — entry point
//
// Usage:  <bitrise-navigation></bitrise-navigation>
//         <bitrise-navigation position="smart"></bitrise-navigation>
//
// All logic lives in src/js/navigation/*.js — this file only re-exports
// the custom element registration and handles webpack HMR.
// ---------------------------------------------------------------------------

// Importing BitriseNavigation registers the <bitrise-navigation> custom element
// and sets up the global loader callback. This runs in both dev and production.
import { connectedInstances, cachedData, setCachedData, init } from './bitrise-navigation/BitriseNavigation';
import { renderNavigation } from './bitrise-navigation/render';

// Explicit initialization — registers the custom element and global callback.
init();

if (import.meta.webpackHot) {
  // Recover data cached by the previous module version.
  if (window.webflowNavHMRData) {
    setCachedData(window.webflowNavHMRData);
    delete window.webflowNavHMRData;
    // Re-render existing instances with the updated render function.
    document.querySelectorAll('bitrise-navigation').forEach((el) => {
      if (el.isConnected && el.shadowRoot) {
        connectedInstances.add(el);
        renderNavigation(el, cachedData());
      }
    });
  }

  import.meta.webpackHot.dispose(() => {
    // Persist data across HMR cycles.
    window.webflowNavHMRData = cachedData();
    document.querySelectorAll('bitrise-navigation').forEach((el) => {
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
