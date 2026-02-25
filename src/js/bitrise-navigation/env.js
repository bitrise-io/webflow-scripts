/** Loader script URLs per environment. */
export const LOADER_URLS = {
  development: '/bitrise-navigation-loader.js',
  production: 'https://web-cdn.bitrise.io/bitrise-navigation-loader.js',
};

/**
 * Determine the environment from the current URL.
 * @returns {'development'|'production'}
 */
export function detectEnv() {
  const queryEnv = window.location.search.match(/env=(\w+)/);
  if (queryEnv?.[1] === 'development') return 'development';
  if (window.location.host.startsWith('localhost') || window.location.host.startsWith('127.0.0.1')) {
    return 'development';
  }
  return 'production';
}
