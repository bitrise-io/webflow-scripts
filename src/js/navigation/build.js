const fs = require('fs');

/**
 *
 */
async function buildNavigation() {
  const outputPath = process.argv[2];
  if (!outputPath) {
    console.error('Usage: node build.js <output-path>');
    process.exit(1);
  }

  const url = 'https://webflow.bitrise.io/';

  let error = null;
  let html = null;
  let css = null;

  process.stdout.write(`Fetching ${url}: `);
  const data = await fetch(url);
  const page = await data.text();
  process.stdout.write(` \x1b[32mdone\x1b[0m\n`);

  const navMatch = page.match(/(<nav class="nav_component".*?)<div class="main-wrapper/s);
  if (!navMatch) {
    (error = error || []).push('Navigation component not found');
  } else {
    [, html] = navMatch;
  }

  const cssUrl = page.match(/https:\/\/[^\s]+?test-e93bfd\.shared\.[a-z0-9]+\.min\.css/);
  if (!cssUrl) {
    (error = error || []).push('CSS URL not found');
  } else {
    process.stdout.write(`Fetching CSS ${cssUrl[0]}: `);
    const cssData = await fetch(cssUrl[0]);
    if (!cssData.ok) {
      (error = error || []).push(`Failed to fetch CSS ${cssUrl[0]}: ${cssData.statusText}`);
    } else {
      css = await cssData.text();
    }
    process.stdout.write(` \x1b[32mdone\x1b[0m\n`);
  }

  const navigationData = { html, css, error };

  const output = `((data) => {
  if (window.webflowNavigationLoaded) {
    window.webflowNavigationLoaded(data);
  }
})(${JSON.stringify(navigationData)})`;

  process.stdout.write(`Writing ${outputPath}: `);
  await fs.promises.writeFile(outputPath, output);
  process.stdout.write(` \x1b[32mdone\x1b[0m\n`);

  if (error) {
    console.warn('Warnings:', error);
  }
}

buildNavigation();
