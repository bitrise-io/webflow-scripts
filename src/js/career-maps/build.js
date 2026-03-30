/* eslint-disable no-await-in-loop */
const fs = require('fs');
const { fetchConfluencePage, parseLevel, parseTeam, parseMain } = require('./CareerParser');

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

const getCompetencyFramworks = async () => {
  const page = await fetchConfluencePage(competencyFrameworkPageURL, { apiEmail: API_EMAIL, apiToken: API_TOKEN });
  const { departments, flatTeams } = await parseMain(page);

  process.stdout.write('Reading Team Pages: ');
  let flatTeam = flatTeams.pop();
  while (flatTeam) {
    const team = departments[flatTeam.departmentId].teams[flatTeam.teamId];
    const teamURL = new URL(team.link);
    const teamPage = await fetchConfluencePage(teamURL, {
      apiEmail: API_EMAIL,
      apiToken: API_TOKEN,
    });

    team.jobs = await parseTeam(team.name, teamPage);

    flatTeam = flatTeams.pop();
  }

  process.stdout.write(' Done\n\n');

  const flatLevels = [];
  departments.forEach((department, departmentId) => {
    department.teams.forEach((team, teamId) => {
      if (team.jobs) {
        Object.keys(team.jobs).forEach((job) => {
          Object.keys(team.jobs[job]).forEach((level) => {
            flatLevels.push({
              departmentId,
              teamId,
              job,
              level,
              link: team.jobs[job][level].link,
            });
          });
        });
      }
    });
  });

  return { departments, flatLevels };
};

(async () => {
  const debug = process.argv.includes('--debug');

  if (debug) {
    process.stdout.write('Debug mode is ON\n');
  }

  try {
    const { departments, flatLevels } = await getCompetencyFramworks();

    process.stdout.write('Reading Level Pages: ');
    let flatLevel = flatLevels.pop();
    while (flatLevel) {
      const level = departments[flatLevel.departmentId].teams[flatLevel.teamId].jobs[flatLevel.job][flatLevel.level];
      const levelURL = new URL(level.link);
      const levelPage = await fetchConfluencePage(levelURL, {
        apiEmail: API_EMAIL,
        apiToken: API_TOKEN,
      });

      departments[flatLevel.departmentId].teams[flatLevel.teamId].jobs[flatLevel.job][flatLevel.level] = {
        ...level,
        ...(await parseLevel(levelPage, debug)),
      };

      flatLevel = flatLevels.pop();
    }

    process.stdout.write(' Done\n\n');

    process.stdout.write('Writing JSON: ');
    await fs.promises.writeFile('./career-maps.json', JSON.stringify(departments, null, 2));
    process.stdout.write('Done\n');
  } catch (err) {
    process.stderr.write(`Failed\n\n`);
    if (debug) {
      process.stderr.write(`${err.stack}\n`);
    } else {
      process.stderr.write(`${err}\n`);
    }
    process.exit(1);
  }
})();
