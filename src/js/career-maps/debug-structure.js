/* eslint-disable no-await-in-loop */
// Debug tool: runs only the "structure" half of the career-maps build (parseMain + parseTeam)
// and prints the resulting department/team/job/level tree, without fetching individual level
// pages. Useful for tracking down jobs that don't get picked up by parseTeam's link matching.
//
// Usage:
//   node ./src/js/career-maps/debug-structure.js
//   node ./src/js/career-maps/debug-structure.js --team="Mobile"   # only fetch teams whose name contains "Mobile"
//   node ./src/js/career-maps/debug-structure.js --show-unmatched  # also list links on each team page that were skipped

const { fetchConfluencePage, parseTeam, parseMain } = require('./CareerParser');

if (!process.env.ATLASSIAN_EMAIL || !process.env.ATLASSIAN_API_TOKEN) {
  process.loadEnvFile();
}

if (!process.env.ATLASSIAN_EMAIL || !process.env.ATLASSIAN_API_TOKEN) {
  process.stderr.write('Error: ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN environment variables must be set.\n');
  process.exit(1);
}

const API_EMAIL = process.env.ATLASSIAN_EMAIL;
const API_TOKEN = process.env.ATLASSIAN_API_TOKEN;

const competencyFrameworkPageURL = new URL(
  'https://bitrise.atlassian.net/wiki/spaces/BO/pages/3100540937/Competency+Frameworks',
);

const teamFilter = process.argv.find((arg) => arg.startsWith('--team='))?.split('=')[1];
const showUnmatched = process.argv.includes('--show-unmatched');

// Mirrors the job-link regex in CareerParser.parseTeam, so we can flag links that look like
// they might be a level indicator but weren't picked up (e.g. a typo, or a level > MAX_LEVEL).
const looksLikeLevel = (text) => /\bP\d{1,2}\b/.test(text);

const findUnmatchedLinks = (teamPage) => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(teamPage.body);
  return [...dom.window.document.querySelectorAll('a')]
    .map((link) => link.textContent.trim())
    .filter((text) => text && looksLikeLevel(text) && !/P(10|[2-9])/.test(text));
};

const printTree = (departments) => {
  console.log('\n=== Career Framework Structure ===\n');

  departments.forEach((department) => {
    console.log(`${department.name} (${department.teams.length} teams)`);

    department.teams.forEach((team, idx) => {
      const isLast = idx === department.teams.length - 1;
      const teamPrefix = isLast ? '└─' : '├─';
      const childPrefix = isLast ? '  ' : '│ ';

      if (!team.link) {
        console.log(`${teamPrefix} ${team.name}  [NO LINK — skipped, jobs never fetched]`);
        return;
      }

      const jobNames = Object.keys(team.jobs || {});
      console.log(`${teamPrefix} ${team.name}  (${jobNames.length} jobs)  ${team.link}`);

      jobNames.forEach((jobName, jobIdx) => {
        const jobIsLast = jobIdx === jobNames.length - 1;
        const jobPrefix = jobIsLast ? '└─' : '├─';
        const levels = team.jobs[jobName];
        const levelKeys = Object.keys(levels);
        console.log(`${childPrefix} ${jobPrefix} ${jobName}  [${levelKeys.join(', ')}]`);

        levelKeys.forEach((levelKey, levelIdx) => {
          const levelIsLast = levelIdx === levelKeys.length - 1;
          const levelPrefix = levelIsLast ? '└─' : '├─';
          const grandchildPrefix = jobIsLast ? '  ' : '│ ';
          console.log(`${childPrefix} ${grandchildPrefix} ${levelPrefix} ${levelKey}: ${levels[levelKey].name}`);
        });
      });

      if (showUnmatched && team.unmatchedLinks?.length) {
        console.log(`${childPrefix} ⚠ Unmatched links on team page: ${JSON.stringify(team.unmatchedLinks)}`);
      }
    });

    console.log('');
  });
};

(async () => {
  try {
    console.log(`Fetching main page: ${competencyFrameworkPageURL}\n`);
    const page = await fetchConfluencePage(competencyFrameworkPageURL, { apiEmail: API_EMAIL, apiToken: API_TOKEN });
    const { departments, flatTeams } = await parseMain(page);

    const totalTeams = flatTeams.length;
    console.log(`parseMain found ${departments.length} departments, ${totalTeams} teams with links.\n`);

    if (teamFilter) {
      console.log(`--team filter active: only fetching teams matching "${teamFilter}"\n`);
    }

    process.stdout.write('Reading Team Pages: ');
    let flatTeam = flatTeams.pop();
    while (flatTeam) {
      const team = departments[flatTeam.departmentId].teams[flatTeam.teamId];

      if (!teamFilter || team.name.toLowerCase().includes(teamFilter.toLowerCase())) {
        const teamURL = new URL(team.link);
        const teamPage = await fetchConfluencePage(teamURL, { apiEmail: API_EMAIL, apiToken: API_TOKEN });

        team.jobs = await parseTeam(team.name, teamPage);
        if (showUnmatched) {
          team.unmatchedLinks = findUnmatchedLinks(teamPage);
        }
        process.stdout.write('.');
      } else {
        process.stdout.write('_');
      }

      flatTeam = flatTeams.pop();
    }
    process.stdout.write(' Done\n');

    printTree(departments);
  } catch (err) {
    process.stderr.write(`Failed\n\n${err.stack}\n`);
    process.exit(1);
  }
})();
