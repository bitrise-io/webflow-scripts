import { handleProxy404 } from '../shared/common';
import {
  INTEGRATIONS_PATH_PREFIX,
  INTEGRATIONS_PROXY_PATH,
  INTEGRATIONS_SUBPAGE_PARAM_NAME,
  INTEGRATIONS_SUBPAGE_PATH_PREFIX,
} from './config';

/**
 * Handles a 404 error for the Integrations by checking if a proxy is available and redirecting if necessary.
 * @param {URL} url - The URL that resulted in a 404 error.
 * @returns {Promise<void>}
 */
export const handleIntegrations404 = async (url) =>
  handleProxy404(url, {
    pathPrefix: INTEGRATIONS_PATH_PREFIX,
    subpageParamName: INTEGRATIONS_SUBPAGE_PARAM_NAME,
    proxyPath: INTEGRATIONS_PROXY_PATH,
    subpagePathPrefix: INTEGRATIONS_SUBPAGE_PATH_PREFIX,
  });
