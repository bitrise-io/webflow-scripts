/* eslint-disable no-await-in-loop */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const email = process.env.ATLASSIAN_EMAIL;
const apiToken = process.env.ATLASSIAN_API_TOKEN;

console.log(`Email: ${email}`);
console.log(`API Token: ${apiToken}`);

const competencyFrameworkPageURL = new URL(
  'https://bitrise.atlassian.net/wiki/spaces/BO/pages/3100540937/Competency+Frameworks',
);
const bodyFormat = 'export_view';

const fetchConfluencePage = async (pageURL) => {
  const pageId = pageURL.pathname.match(/pages\/(\d+)/)[1];
  const response = await fetch(`https://${pageURL.hostname}/wiki/api/v2/pages/${pageId}?body-format=${bodyFormat}`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
      Accept: 'application/json',
    },
  });

  const data = await response.json();
  return {
    title: data.title,
    body: data.body[bodyFormat].value,
    updatedAt: data.version.createdAt,
  };
};

const getCompetencyFramworks = async () => {
  const page = await fetchConfluencePage(competencyFrameworkPageURL);
  const dom = new JSDOM(page.body);

  const mainTable = dom.window.document.querySelector('table');
  const departments = [...mainTable.querySelectorAll('th')].map((header) => {
    return {
      name: header.textContent.replace(' Teams', ''),
      teams: [],
    };
  });

  const flatTeams = [];

  [...mainTable.querySelectorAll('tr')].forEach((row) => {
    if (row.querySelector('th')) return;

    [...row.querySelectorAll('td')].forEach((cell, idx) => {
      const teamLink = cell.querySelector('a');
      const teamName = cell.textContent.replace(' Team', '').trim();
      if (teamName) {
        if (teamLink) {
          const team = {
            name: teamName,
            link: teamLink.href,
            jobs: {},
          };
          departments[idx].teams.push(team);
          flatTeams.push({
            departmentId: idx,
            teamId: departments[idx].teams.length - 1,
          });
        } else {
          const team = {
            name: teamName,
          };
          departments[idx].teams.push(team);
        }
      }
    });
  });

  const sameJobs = {
    Engineering: [['Software Engineer', 'Engineer']],
    Support: [['Customer Specialist'], ['Technical Specialist'], ['Technical Writer']],
    Sales: [
      ['Renewal Specialist', 'Renewal Representative'],
      ['Business Development Representative'],
      ['Account Executive', 'Sales Account Executive', 'Sales Representative'],
    ],
    People: [['People Operations'], ['Payroll']],
  };

  process.stdout.write('Reading Team Pages: ');
  let flatTeam = flatTeams.pop();
  while (flatTeam) {
    const team = departments[flatTeam.departmentId].teams[flatTeam.teamId];
    const teamURL = new URL(team.link);
    const teamPage = await fetchConfluencePage(teamURL);
    const teamPageDom = new JSDOM(teamPage.body);
    process.stdout.write('.');
    [...teamPageDom.window.document.querySelectorAll('a')].forEach((link) => {
      const levelMatch = link.textContent.match(/P(10|[2-9])/);
      if (levelMatch) {
        let jobName = link.textContent
          .replace(levelMatch[0], '')
          .replaceAll(/[^ a-zA-Z0-9]/g, '')
          .replaceAll(/Associate|Senior|Staff|Principal|Distinguished|Fellow|Tech Lead/g, '')
          .replaceAll(/Engineering/g, 'Engineer')
          .trim();

        if (sameJobs[team.name]) {
          sameJobs[team.name].forEach((job) => {
            if (jobName.match(new RegExp(job.join('|'), 'i'))) {
              const [firstJob] = job;
              jobName = firstJob;
            }
          });
        }

        if (!team.jobs[jobName]) team.jobs[jobName] = {};
        team.jobs[jobName][levelMatch[0]] = {
          name: link.textContent,
          link: link.href,
        };
      }
    });
    flatTeam = flatTeams.pop();
  }

  process.stdout.write(' Done\n\n');

  // console.dir(departments, { depth: null });

  let competencyFrameworksMap = '<html>\n<head>\n<title>Competency Frameworks</title>\n</head>\n<body>\n';
  competencyFrameworksMap += '<h1>Competency Frameworks</h1>\n';
  departments.forEach((department) => {
    competencyFrameworksMap += `<h2>${department.name}</h2>`;
    department.teams.forEach((team) => {
      competencyFrameworksMap += `<h3>${team.name}</h3>`;
      if (team.jobs) {
        competencyFrameworksMap += '<ul>';
        Object.keys(team.jobs).forEach((jobName) => {
          competencyFrameworksMap += `<li>${jobName}</li>`;
          Object.keys(team.jobs[jobName]).forEach((level) => {
            const job = team.jobs[jobName][level];
            competencyFrameworksMap += `<ul><li><a href="${job.link}">${job.name}</a></li></ul>`;
          });
        });
        competencyFrameworksMap += '</ul>';
      }
    });
  });
  competencyFrameworksMap += '</body>\n</html>';

  await fs.promises.writeFile('dist/competency-frameworks.html', competencyFrameworksMap);
};

(async () => {
  try {
    getCompetencyFramworks();
  } catch (err) {
    console.error(err);
  }
})();
