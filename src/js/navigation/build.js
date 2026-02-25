const fs = require('fs');
const { JSDOM } = require('jsdom');

const FETCH_TIMEOUT_MS = 30000;
const SOURCE_URL = 'https://webflow.bitrise.io/';

// Selectors & patterns — centralised so they're easy to update when Webflow changes.
const NAV_SELECTOR = 'nav.nav_component';
const CSS_HREF_PATTERN = /\.shared\.[a-z0-9]+\.min\.css/;

/**
 * Fetch with a timeout and automatic ok-check.
 * @param {string} url
 * @param {string} label - human-readable label for error messages
 * @returns {Promise<Response>}
 */
async function safeFetch(url, label) {
  process.stdout.write(`Fetching ${label}: `);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${label} returned ${response.status} ${response.statusText}`);
  }
  process.stdout.write(`\x1b[32mdone\x1b[0m\n`);
  return response;
}

/**
 * Build the navigation loader script.
 *
 * Fetches the Webflow source page, extracts the nav component HTML via
 * DOM parsing (not regex), finds the shared CSS URL, and writes a JS
 * loader file that the consumer script injects at runtime.
 */
async function buildNavigation() {
  const outputPath = process.argv[2];
  if (!outputPath) {
    process.stderr.write('Usage: node build.js <output-path>\n');
    process.exit(1);
  }

  const errors = [];
  let html = null;
  let css = null;

  // --- Fetch & parse the source page ---
  const pageResponse = await safeFetch(SOURCE_URL, SOURCE_URL);
  const pageText = await pageResponse.text();
  const dom = new JSDOM(pageText);
  const { document } = dom.window;

  // --- Extract navigation HTML via DOM ---
  const navElement = document.querySelector(NAV_SELECTOR);
  if (!navElement) {
    errors.push(`Navigation element matching "${NAV_SELECTOR}" not found`);
  } else {
    html = navElement.outerHTML;
  }

  // --- Find the shared CSS URL ---
  const linkElements = [...document.querySelectorAll('link[rel="stylesheet"][href]')];
  const cssLink = linkElements.find((el) => CSS_HREF_PATTERN.test(el.getAttribute('href')));
  if (!cssLink) {
    errors.push(`CSS <link> matching ${CSS_HREF_PATTERN} not found`);
  } else {
    const cssUrl = cssLink.getAttribute('href');
    const cssResponse = await safeFetch(cssUrl, 'CSS');
    css = await cssResponse.text();
  }

  // --- Build the output ---
  const navigationData = {
    html,
    css,
    error: errors.length > 0 ? errors : null,
  };

  // Escape </script> sequences so the output is safe to inline if needed.
  const jsonPayload = JSON.stringify(navigationData).replace(/<\/script>/gi, '<\\/script>');

  const output = `((data) => {
  if (window.webflowNavigationLoaded) {
    window.webflowNavigationLoaded(data);
  }
})(${jsonPayload})`;

  process.stdout.write(`Writing ${outputPath}: `);
  await fs.promises.writeFile(outputPath, output);
  process.stdout.write(`\x1b[32mdone\x1b[0m\n`);

  if (errors.length > 0) {
    process.stderr.write(`\x1b[33mWarnings: ${errors.join(', ')}\x1b[0m\n`);
    process.exit(1);
  }
}

buildNavigation().catch((err) => {
  process.stderr.write(`\x1b[31mBuild failed: ${err.message}\x1b[0m\n`);
  process.exit(1);
});
