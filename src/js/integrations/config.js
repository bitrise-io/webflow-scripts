export const INTEGRATIONS_PATH_PREFIX = '/integrations/steps';

export const INTEGRATIONS_SUBPAGE_PARAM_NAME = 'step';

export const INTEGRATIONS_SUBPAGE_PATH_PREFIX = `/integrations/step`;

export const INTEGRATIONS_PROXY_PATH = `/integrations-proxy`;

/**
 * Checks if the integrations proxy is available.
 * If not, rewrites step links to use query parameter fallback URLs.
 */
export async function applyProxyFallback() {
  const proxyAvailable = await fetch(INTEGRATIONS_PROXY_PATH)
    .then((response) => response.ok)
    .catch(() => false);

  if (!proxyAvailable) {
    document.querySelectorAll(`a[href^="${INTEGRATIONS_PATH_PREFIX}"]`).forEach((link) => {
      const stepKey = link.getAttribute('href').replace(new RegExp(`^.*${INTEGRATIONS_PATH_PREFIX}/`), '');
      link.href = `${INTEGRATIONS_SUBPAGE_PATH_PREFIX}?${INTEGRATIONS_SUBPAGE_PARAM_NAME}=${stepKey}`;
    });
  }
}
