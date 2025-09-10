import '../css/404.css';

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
const getStatus = async (statusURL) => {
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

window.addEventListener('load', async () => {
  try {
    const statusLink = document.querySelector('div#bitrise-status a');
    const { severity, message } = await getStatus(statusLink.href);
    statusLink.className = `severity-${severity}`;
    statusLink.innerHTML = `Status: ${message}`;
  } catch (e) {
    /* don't update status badge */
  }
});
