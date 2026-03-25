/**
 * Statuspage Embed Link
 * @see https://metastatuspage.com/api
 */

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

/**
 * @param {URL} statusURL
 * @returns {Promise<{
 *  severity: "minor" | "major" | "critical" | "none";
 *  message: string;
 * }>}
 */
export const getStatus = async (statusURL) => {
  const statusAPIURL = new URL(statusURL);
  statusAPIURL.pathname = '/api/v2/status.json';
  const result = await fetch(statusAPIURL);
  /** @type {StatusResult} */
  const data = await result.json();
  return {
    severity: data.status.indicator === 'maintenance' ? 'minor' : data.status.indicator,
    message: data.status.description,
  };
};

export const renderStatus = async (statusLink) => {
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
};
