import { handleProxy404 } from '../shared/common';
import { STACKS_PATH_PREFIX, STACKS_PROXY_PATH, STACKS_SUBPAGE_PARAM_NAME, STACKS_SUBPAGE_PATH_PREFIX } from './config';

/**
 * Handles a 404 error for the Stacks by checking if a proxy is available and redirecting if necessary.
 * @param {URL} url - The URL that resulted in a 404 error.
 * @returns {Promise<void>}
 */
export const handleStacks404 = async (url) =>
  handleProxy404(url, {
    pathPrefix: STACKS_PATH_PREFIX,
    subpageParamName: STACKS_SUBPAGE_PARAM_NAME,
    proxyPath: STACKS_PROXY_PATH,
    subpagePathPrefix: STACKS_SUBPAGE_PATH_PREFIX,
  });
