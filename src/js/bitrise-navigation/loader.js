import { detectEnv, LOADER_URLS } from './env';

/** Cached payload from the loader script — shared across all components. */
let cachedDataInternal = null;

/** @returns {object|null} */
export function cachedData() {
  return cachedDataInternal;
}

/**
 * Replace the cached data (used by HMR recovery).
 * @param {object|null} data
 */
export function setCachedData(data) {
  cachedDataInternal = data;
}

/** Callbacks to invoke when loader data arrives. */
const dataListeners = new Set();

/**
 * Register a callback to be invoked when loader data becomes available.
 * @param {(data: object) => void} callback
 */
export function addDataListener(callback) {
  dataListeners.add(callback);
}

/**
 * Set up the global callback that the loader script invokes.
 * Must be called once by the entry point before any component init.
 */
export function initLoader() {
  window.bitriseNavigationLoaded = (data) => {
    cachedDataInternal = data;
    dataListeners.forEach((cb) => cb(data));
  };
}

/**
 * Append the loader script to <head> if not already present.
 * In production, appends a cache-busting query parameter (1-hour time bucket)
 * so Cloudflare treats each hour as a unique URL.
 */
export function ensureLoader() {
  if (document.querySelector('script[data-bitrise-navigation-loader]')) return;
  const env = detectEnv();
  const baseUrl = LOADER_URLS[env] || LOADER_URLS.production;
  const cacheBust = Math.floor(Date.now() / 3600000);
  const script = document.createElement('script');
  script.setAttribute('data-bitrise-navigation-loader', '');
  script.src = env === 'development' ? baseUrl : `${baseUrl}?v=${cacheBust}`;
  document.head.appendChild(script);
}

/**
 * Remove font-face styles only when no bitrise-navigation or bitrise-footer
 * elements remain in the document.
 */
export function cleanupFontsIfUnused() {
  if (!document.querySelector('bitrise-navigation, bitrise-footer')) {
    document.querySelector('style[data-bitrise-navigation-fonts]')?.remove();
  }
}
