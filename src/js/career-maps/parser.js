const { fetchConfluencePage, parseLevel } = require('./CareerParser');

if (!process.env.ATLASSIAN_EMAIL || !process.env.ATLASSIAN_API_TOKEN) {
  process.loadEnvFile();
}

if (!process.env.ATLASSIAN_EMAIL || !process.env.ATLASSIAN_API_TOKEN) {
  process.stderr.write('Error: ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN environment variables must be set.\n');
  process.exit(1);
}

const API_EMAIL = process.env.ATLASSIAN_EMAIL;
const API_TOKEN = process.env.ATLASSIAN_API_TOKEN;

(async () => {
  if (process.argv.includes('--level')) {
    const levelURL = process.argv[process.argv.indexOf('--level') + 1];
    if (levelURL) {
      try {
        const levelPage = await fetchConfluencePage(new URL(levelURL), { apiEmail: API_EMAIL, apiToken: API_TOKEN });
        const levelData = await parseLevel(levelPage);
        process.stdout.write(JSON.stringify(levelData, null, 2));
      } catch (error) {
        process.stderr.write(`Error fetching or parsing level page: ${error.message}\n`);
      }
    } else {
      process.stderr.write('Error: No level URL provided after --level argument.\n');
    }
    process.exit(0);
  }
})();
