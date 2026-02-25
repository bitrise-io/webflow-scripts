/** Loader script URLs per environment. */
export const LOADER_URLS = {
  development: '/navigation_loader.js',
  production: 'https://web-cdn.bitrise.io/navigation_loader.js',
};

/**
 * Determine the environment, preferring an explicit override.
 * @param {string|null} attrOverride - Value from the `env` attribute.
 * @returns {'development'|'production'}
 */
export function detectEnv(attrOverride) {
  if (attrOverride) return attrOverride;
  const queryEnv = window.location.search.match(/env=(\w+)/);
  if (queryEnv?.[1] === 'development') return 'development';
  if (window.location.host.startsWith('localhost') || window.location.host.startsWith('127.0.0.1')) {
    return 'development';
  }
  return 'production';
}
