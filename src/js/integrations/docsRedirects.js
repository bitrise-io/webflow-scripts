import redirectsRaw from '../../../data/integrations-docs-redirects.txt?raw';

/**
 * Parses the tab-separated devcenter -> docs redirect list into a Map.
 * Lines whose target isn't a resolved URL yet (e.g. "DECIDE: ...") are skipped.
 * @param {string} raw
 * @returns {Map<string, string>}
 */
function parseRedirects(raw) {
  const redirects = new Map();

  raw.split('\n').forEach((line) => {
    const [source, targetField] = line.split('\t');
    if (!source || !targetField) return;

    const target = targetField.trim().split(/\s+/)[0];
    if (!/^https?:\/\//i.test(target)) return;

    redirects.set(source.trim(), target);
  });

  return redirects;
}

/**
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const redirects = parseRedirects(redirectsRaw);

// Longest URLs first so a URL that is a prefix of another (e.g. with an extra #anchor) doesn't shadow it.
const redirectPattern = redirects.size
  ? new RegExp(
      Array.from(redirects.keys())
        .sort((a, b) => b.length - a.length)
        .map(escapeRegExp)
        .join('|'),
      'g',
    )
  : null;

/**
 * Rewrites any devcenter.bitrise.io links found in the given HTML/text to their docs.bitrise.io replacement.
 * @param {string} html
 * @returns {string}
 */
export function rewriteDocsLinks(html) {
  if (!html || !redirectPattern) return html;
  return html.replace(redirectPattern, (match) => redirects.get(match) ?? match);
}
