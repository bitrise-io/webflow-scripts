/**
 * Statuspage Embed Link
 * @see https://metastatuspage.com/api
 */

import '../css/status.css';

/**
 * @typedef {{
 *  page: {
 *    id: string;
 *    name: string;
 *    url: string;
 *    time_zone: string;
 *    updated_at: string;
 *  };
 *  status: {
 *    indicator: "minor" | "major" | "critical" | "none" | "maintenance";
 *    description: string;
 *  };
 * }} StatusResult
 */

(async () => {
  /** @type {HTMLAnchorElement} */
  const statusLink = document.getElementById('statuspage');
  statusLink.className = `statuspage__entry-point`;

  const statusURL = new URL(statusLink.href);
  statusURL.pathname = '/api/v2/status.json';

  try {
    const result = await fetch(statusURL);
    /** @type {StatusResult} */
    const data = await result.json();
    const severity = data.status.indicator === 'maintenance' ? 'minor' : data.status.indicator;
    statusLink.className = `statuspage__entry-point statuspage__severity-${severity}`;
    statusLink.innerHTML = `Status: ${data.status.description}`;
  } catch (e) {
    /* something's wrong */
  }
})();

if (import.meta.webpackHot) import.meta.webpackHot.accept();
