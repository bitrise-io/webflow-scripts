const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..', '..');
const srcDir = path.resolve(rootDir, 'src');
const distDir = path.resolve(rootDir, 'dist');

/**
 * @param {object} [options]
 * @param {boolean} [options.skipJs] - If true, keep status.js as a script src (for dev server)
 * @returns {Promise<string>} The generated HTML with all assets inlined
 */
const generateMaintenanceHtml = async (options = {}) => {
  let html = await fs.promises.readFile(path.join(srcDir, 'html', 'maintenance.html'), 'utf8');

  // Inline CSS files
  const maintenanceCss = await fs.promises.readFile(path.join(srcDir, 'css', 'maintenance.css'), 'utf8');
  html = html.replace('<link rel="stylesheet" href="maintenance.css">', `<style>\n${maintenanceCss}</style>`);

  // Inline JS (skip in dev — style-loader's HMR runtime needs publicPath from script.src)
  if (!options.skipJs) {
    const jsContent = await fs.promises.readFile(path.join(distDir, 'status.js'), 'utf8');
    html = html.replace('<script src="status.js"></script>', `<script>\n${jsContent}</script>`);
  }

  // Inline SVGs
  const logoSvg = await fs.promises.readFile(path.join(srcDir, 'images', 'maintenance', 'bitrise_logo.svg'), 'utf8');
  html = html.replace(/<img src="bitrise_logo\.svg"[^>]*>/, logoSvg.trim());

  const maintenanceSvg = await fs.promises.readFile(
    path.join(srcDir, 'images', 'maintenance', 'bitrise_maintenance.svg'),
    'utf8',
  );
  html = html.replace(
    /<img[^>]*src="bitrise_maintenance\.svg"[^>]*>/,
    maintenanceSvg.trim().replace('<svg ', '<svg class="error" '),
  );

  return html;
};

/**
 * Build maintenance.html to dist/
 */
const build = async () => {
  const html = await generateMaintenanceHtml();
  await fs.promises.mkdir(distDir, { recursive: true });
  await fs.promises.writeFile(path.join(distDir, 'maintenance.html'), html);
  process.stdout.write('Built dist/maintenance.html\n');
};

module.exports = { generateMaintenanceHtml, build };

// Run build when executed directly
if (require.main === module) {
  build().catch((error) => {
    process.stderr.write(`Maintenance build failed: ${error.message}\n`);
    process.exit(1);
  });
}
