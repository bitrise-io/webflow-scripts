// A fetch that gives up after a deadline. Without one, a stalled upstream (Discourse, the CDN or the origin that
// serves the page template) keeps the visitor's request loading until the platform kills it.
// The signal also covers reading the body, so a response that starts and then stalls is cut off too.
export const UPSTREAM_TIMEOUT_MS = 8 * 1000;

export const fetchWithTimeout = (url, init = {}, timeoutMs = UPSTREAM_TIMEOUT_MS) =>
  fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
