const fs = require('fs');
const path = require('path');

/**
 * @param {object} [options]
 * @param {boolean} [options.skipJs] - If true, keep status.js as a script src (for dev server)
 * @param {string} [options.distPath] - Path to dist/ directory (defaults to ./dist)
 * @param {string} [options.srcPath] - Path to src/ directory (defaults to ./src)
 * @returns {Promise<string>} The generated HTML with all assets inlined
 */
const generateMaintenanceHtml = async ({ skipJs, distPath, srcPath }) => {
  let html = await fs.promises.readFile(path.join(srcPath, 'html', 'maintenance.html'), 'utf8');

  // Inline CSS files
  const maintenanceCss = await fs.promises.readFile(path.join(srcPath, 'css', 'maintenance.css'), 'utf8');
  html = html.replace('<link rel="stylesheet" href="maintenance.css">', `<style>\n${maintenanceCss}</style>`);

  // Inline JS (skip in dev — style-loader's HMR runtime needs publicPath from script.src)
  if (!skipJs) {
    const jsContent = await fs.promises.readFile(path.join(distPath, 'status.js'), 'utf8');
    html = html.replace('<script src="status.js"></script>', `<script>\n${jsContent}</script>`);
  }

  // Inline SVGs
  const logoSvg = await fs.promises.readFile(path.join(srcPath, 'images', 'maintenance', 'bitrise_logo.svg'), 'utf8');
  html = html.replace(/<img src="bitrise_logo\.svg"[^>]*>/, logoSvg.trim());

  const maintenanceSvg = await fs.promises.readFile(
    path.join(srcPath, 'images', 'maintenance', 'bitrise_maintenance.svg'),
    'utf8',
  );
  html = html.replace(
    /<img[^>]*src="bitrise_maintenance\.svg"[^>]*>/,
    maintenanceSvg.trim().replace('<svg ', '<svg class="error" '),
  );

  return html;
};

/**
 * Build maintenance.html to {distPath}/maintenance.html, inlining all assets (CSS, JS, SVGs)
 * @param {object} [options]
 * @param {string} [options.distPath] - Path to dist/ directory where maintenance.html should be written
 * @param {string} [options.srcPath] - Path to src/ directory where source files are located
 */
const build = async ({ distPath, srcPath }) => {
  const html = await generateMaintenanceHtml({ distPath, srcPath });
  await fs.promises.mkdir(distPath, { recursive: true });
  await fs.promises.writeFile(path.join(distPath, 'maintenance.html'), html);
  process.stdout.write(`Built ${path.join(distPath, 'maintenance.html')}\n`);
};

module.exports = { generateMaintenanceHtml, build };

// Run build when executed directly
if (require.main === module) {
  build().catch((error) => {
    process.stderr.write(`Maintenance build failed: ${error.message}\n`);
    process.exit(1);
  });
}
