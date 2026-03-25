import { handleProxy404 } from '../shared/common';
import {
  CHANGELOG_PATH_PREFIX,
  CHANGELOG_PROXY_PATH,
  CHANGELOG_SUBPAGE_PARAM_NAME,
  CHANGELOG_SUBPAGE_PATH_PREFIX,
} from './config';

/**
 * Handles a 404 error for the Changelog by checking if a proxy is available and redirecting if necessary.
 * @param {URL} url - The URL that resulted in a 404 error.
 * @returns {Promise<void>}
 */
export const handleChangelog404 = async (url) =>
  handleProxy404(url, {
    pathPrefix: CHANGELOG_PATH_PREFIX,
    subpageParamName: CHANGELOG_SUBPAGE_PARAM_NAME,
    proxyPath: CHANGELOG_PROXY_PATH,
    subpagePathPrefix: CHANGELOG_SUBPAGE_PATH_PREFIX,
  });
