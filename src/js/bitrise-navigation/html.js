import { rewriteGlobalSelectors } from './css';

/**
 * Strip script tags and rewrite global selectors in HTML.
 * @param {string} rawHTML
 * @returns {string}
 */
export function sanitizeHTML(rawHTML) {
  return rewriteGlobalSelectors(rawHTML.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''));
}
