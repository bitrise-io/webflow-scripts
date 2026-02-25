// ---------------------------------------------------------------------------
// <webflow-navigation> custom element — entry point
//
// Usage:  <webflow-navigation></webflow-navigation>
//         <webflow-navigation env="development"></webflow-navigation>
//
// All logic lives in src/js/navigation/*.js — this file only re-exports
// the custom element registration and handles webpack HMR.
// ---------------------------------------------------------------------------

// Importing WebflowNavigation registers the <webflow-navigation> custom element
// and sets up the global loader callback. This runs in both dev and production.
import { connectedInstances, cachedData, setCachedData, init } from './navigation/WebflowNavigation';
import { renderNavigation } from './navigation/render';

// Explicit initialization — registers the custom element and global callback.
init();

if (import.meta.webpackHot) {
  // Recover data cached by the previous module version.
  if (window.webflowNavHMRData) {
    setCachedData(window.webflowNavHMRData);
    delete window.webflowNavHMRData;
    // Re-render existing instances with the updated render function.
    document.querySelectorAll('webflow-navigation').forEach((el) => {
      if (el.isConnected && el.shadowRoot) {
        connectedInstances.add(el);
        renderNavigation(el, cachedData());
      }
    });
  }

  import.meta.webpackHot.dispose(() => {
    // Persist data across HMR cycles.
    window.webflowNavHMRData = cachedData();
    document.querySelectorAll('webflow-navigation').forEach((el) => {
      if (el.shadowRoot) {
        el.shadowRoot.innerHTML = '';
        if ('adoptedStyleSheets' in Document.prototype) {
          el.shadowRoot.adoptedStyleSheets = [];
        }
      }
    });
    document.querySelector('style[data-webflow-navigation-fonts]')?.remove();
    document.querySelector('script[data-webflow-navigation-loader]')?.remove();
  });

  import.meta.webpackHot.accept();
}
