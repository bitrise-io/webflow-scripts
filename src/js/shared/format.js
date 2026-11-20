// Pure text helpers shared by the Cloudflare workers (server-side rendering) and the browser scripts.
// Must not touch `document`.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formats the calendar date written in an ISO timestamp ("2026-11-17T17:16:53-06:00" -> "Nov 17, 2026").
 * The date is taken as published instead of converted to a time zone, so the worker (UTC) and every browser agree.
 * @param {string} isoString
 * @returns {string}
 */
export const formatIsoDate = (isoString) => {
  const match = String(isoString).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return '';
  return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`;
};

/**
 * @param {string} text
 * @returns {string}
 */
export const escapeHtml = (text) =>
  String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
};

/**
 * Decodes the HTML entities that show up in rendered markdown.
 * @param {string} text
 * @returns {string}
 */
export const decodeEntities = (text) =>
  text.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (match, decimal, hex, name) => {
    if (decimal) return String.fromCodePoint(Number(decimal));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    return NAMED_ENTITIES[name.toLowerCase()] ?? match;
  });

/**
 * Plain text summary of an HTML fragment, for meta descriptions.
 * @param {string} html
 * @param {number} [maxLength]
 * @returns {string}
 */
export const summarizeHtml = (html, maxLength = 200) => {
  const text = decodeEntities(
    html
      .replace(/<(script|style|svg)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  return `${cut.slice(0, cut.lastIndexOf(' ') > maxLength / 2 ? cut.lastIndexOf(' ') : cut.length).replace(/[\s.,;:!?-]+$/, '')}…`;
};
