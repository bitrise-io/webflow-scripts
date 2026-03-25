import { APP_NAVIGATOR_FALLBACK_DOMAIN, APP_NAVIGATOR_PATH_PREFIX, APP_NAVIGATOR_PROXY_PATH } from './config';

/**
 * Handles a 404 error for the App Navigator by checking if a proxy is available and redirecting if necessary.
 * @param {URL} url - The URL that resulted in a 404 error.
 * @return {Promise<void>}
 */
export const handleAppNavigator404 = async (url) => {
  if (url.pathname.startsWith(APP_NAVIGATOR_PATH_PREFIX)) {
    const appNavigatorProxyAvailable = await fetch(APP_NAVIGATOR_PROXY_PATH)
      .then((appNavigatorProxyResponse) => appNavigatorProxyResponse.ok)
      .catch(() => false);
    if (!appNavigatorProxyAvailable) {
      window.location.href = `${APP_NAVIGATOR_FALLBACK_DOMAIN}${url.pathname}`;
    }
  }
};
