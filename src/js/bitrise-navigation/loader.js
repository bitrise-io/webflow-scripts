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
 * URL of the immutable, content-hashed payload from the release manifest (set by the bootstrap script), or null
 * when the component was not started through the bootstrap.
 * @returns {string|null}
 */
export function manifestDataUrl() {
  const manifest = window.bitriseNavigationManifest;
  return manifest && manifest.base && manifest.data ? `${manifest.base}${manifest.data}` : null;
}

/**
 * Append the payload script to <head> if not already present.
 * In production it loads the hashed payload named by the release manifest, which never needs cache busting.
 * Without a manifest it falls back to the stable loader URL with a 1-hour cache-busting query parameter.
 */
export function ensureLoader() {
  if (document.querySelector('script[data-bitrise-navigation-loader]')) return;
  const env = detectEnv();
  const baseUrl = LOADER_URLS[env] || LOADER_URLS.production;
  const cacheBust = Math.floor(Date.now() / 3600000);
  const script = document.createElement('script');
  script.setAttribute('data-bitrise-navigation-loader', '');
  if (env === 'development') {
    script.src = baseUrl;
  } else {
    script.src = manifestDataUrl() || `${baseUrl}?v=${cacheBust}`;
  }
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
