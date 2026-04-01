/**
 * @typedef {{
 *  document: Document,
 *  hostname: string,
 * }} DocumentContext
 */

/** @type {DocumentContext|null} */
let currentContext = null;

/**
 * Sets the document context for rendering components.
 * Call this once at the entry point before constructing any components.
 * @param {Document} doc
 * @param {string} [hostname]
 */
export function setDocumentContext(doc, hostname) {
  currentContext = {
    document: doc,
    hostname: hostname || '',
  };
}

/**
 * Returns the current document context.
 * @returns {DocumentContext}
 */
export function getDocumentContext() {
  if (!currentContext) {
    throw new Error('Document context not set. Call setDocumentContext() before using rendering components.');
  }
  return currentContext;
}

/**
 * Clears the document context (useful for tests).
 */
export function clearDocumentContext() {
  currentContext = null;
}
