/* eslint-disable no-await-in-loop */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const API_EMAIL = process.env.ATLASSIAN_EMAIL;
const API_TOKEN = process.env.ATLASSIAN_API_TOKEN;
const MAX_LEVEL = 6;

// console.log(`Email: ${API_EMAIL}`);
// console.log(`API Token: ${API_TOKEN}`);

const competencyFrameworkPageURL = new URL(
  'https://bitrise.atlassian.net/wiki/spaces/BO/pages/3100540937/Competency+Frameworks',
);
const bodyFormat = 'export_view';

const fetchConfluencePage = async (pageURL) => {
  const pageId = pageURL.pathname.match(/pages\/(\d+)/)[1];
  const response = await fetch(`https://${pageURL.hostname}/wiki/api/v2/pages/${pageId}?body-format=${bodyFormat}`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${API_EMAIL}:${API_TOKEN}`).toString('base64')}`,
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
      if (levelMatch && parseInt(levelMatch[1], 10) <= MAX_LEVEL) {
        let jobName = link.textContent
          .replace(levelMatch[0], '')
          .replaceAll(/[^ a-zA-Z0-9]/g, '')
          .replaceAll(/Associate|Senior|Staff|Principal|Distinguished|Fellow|Tech Lead/g, '')
          .replaceAll(/Engineering/g, 'Engineer')
          .trim();

        if (sameJobs[team.name]) {
          sameJobs[team.name].forEach((job) => {
            if (jobName.match(new RegExp(job.join('|'), 'i'))) {
              [jobName] = job;
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

  return departments;
};

(async () => {
  const debug = process.argv.includes('--debug');

  if (debug) {
    process.stdout.write('Debug mode is ON\n');
  }

  try {
    const departments = await getCompetencyFramworks();

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

    const addWarning = (level, message) => {
      level.warnings.push(message);
      if (debug) {
        process.stderr.write(`Warning in ${level.name}: ${message}\n`);
      }
    };

    const sameLocations = [['Hungary (HUF)', 'Hungary', 'HU']];

    const hasSalary = (element) => {
      return element.querySelector('th')?.textContent.match(/Salary ranges for this (position|level)/);
    };

    const getSalaryData = (element) => {
      const salary = {};
      [...element.querySelectorAll('tr')]
        .filter((row) => row.querySelector('td'))
        .forEach((row) => {
          const [location, lowEnd, midPoint, highEnd] = [...row.querySelectorAll('td')].map((cell) => cell.textContent);

          if (location && lowEnd && midPoint && highEnd) {
            let locationName = location;
            sameLocations.forEach((loc) => {
              if (locationName.match(new RegExp(loc.join('|'), 'i'))) {
                [locationName] = loc;
              }
            });

            salary[locationName] = {
              lowEnd: parseInt(lowEnd.replaceAll(/,/g, '').trim(), 10),
              midPoint: parseInt(midPoint.replaceAll(/,/g, '').trim(), 10),
              highEnd: parseInt(highEnd.replaceAll(/,/g, '').trim(), 10),
            };
          }
        });
      return salary;
    };

    const getVariablePayComissionOrBonusData = (element, labelPattern) => {
      const bonusRow = [...element.querySelectorAll('tr')].find((row) =>
        [...row.querySelectorAll('th')].find((th) => th.textContent.match(labelPattern)),
      );
      if (bonusRow) {
        let dataCell;
        const bonusCells = bonusRow.querySelectorAll('td, th');
        if (bonusCells.length > 1) {
          [, dataCell] = bonusCells;
        } else {
          dataCell = [...bonusRow.querySelectorAll('th')].find((th) => th.textContent.match(labelPattern));
        }
        if (dataCell) {
          const data = dataCell.textContent.trim().replace(/,/, '.').replace(/ %/, '%');
          return data;
        }
      }
      return null;
    };

    const hasVariablePay = (element) => {
      return [...element.querySelectorAll('tr')].some((row) =>
        [...row.querySelectorAll('th')].find((th) => th.textContent.match(/Variable pay percentage for this position/)),
      );
    };

    const getVariablePayData = (element) => {
      return getVariablePayComissionOrBonusData(element, /Variable pay percentage for this position/);
    };

    const hasCommission = (element) => {
      return [...element.querySelectorAll('tr')].some((row) =>
        [...row.querySelectorAll('th')].find((th) => th.textContent.match(/Commission percentage for this position/)),
      );
    };

    const getCommissionData = (element) => {
      return getVariablePayComissionOrBonusData(element, /Commission percentage for this position/);
    };

    const hasBonus = (element) => {
      return [...element.querySelectorAll('tr')].some((row) =>
        [...row.querySelectorAll('th')].find((th) => th.textContent.match(/Bonus percentage for this position/)),
      );
    };

    const getBonusData = (element) => {
      return getVariablePayComissionOrBonusData(element, /Bonus percentage for this position/);
    };

    const hasTenure = (element) => {
      return [...element.querySelectorAll('th')].find((th) => th.textContent === 'Tenure') !== undefined;
    };

    const getTenureData = (element) => {
      const tenureTableRow = [...element.querySelectorAll('tr')].find((row) =>
        [...row.querySelectorAll('th')].find((th) => th.textContent === 'Tenure'),
      );
      if (tenureTableRow) {
        let dataCell = tenureTableRow.querySelector('td');
        if (!dataCell) {
          dataCell = [...tenureTableRow.querySelectorAll('th')].find((th) => th.textContent !== 'Tenure');
        }
        if (dataCell) {
          return dataCell.innerHTML;
        }
      }
      return null;
    };

    process.stdout.write('Reading Level Pages: ');
    let flatLevel = flatLevels.pop();
    while (flatLevel) {
      const level = departments[flatLevel.departmentId].teams[flatLevel.teamId].jobs[flatLevel.job][flatLevel.level];
      const levelPage = await fetchConfluencePage(new URL(flatLevel.link));
      const levelPageDom = new JSDOM(levelPage.body);
      process.stdout.write('.');

      level.warnings = [];

      const elements = [...levelPageDom.window.document.querySelector('body').children].filter((element) =>
        element.textContent.trim(),
      );
      let element = elements.shift();

      while (element) {
        if (hasSalary(element)) {
          level.salary = getSalaryData(element);
        } else if (hasVariablePay(element)) {
          level.variablePay = getVariablePayData(element);
        } else if (hasBonus(element)) {
          level.bonus = getBonusData(element);
        } else if (hasCommission(element)) {
          level.commission = getCommissionData(element);
        } else if (hasTenure(element)) {
          level.tenure = getTenureData(element);
        } else if (!element.outerHTML.match(/^<div class="confluence-information-macro/)) {
          if (!level.description) {
            level.description = '';
          }
          level.description += `${element.outerHTML}`;
        }

        element = elements.shift();
      }

      if (!level.salary || Object.keys(level.salary).length === 0) {
        addWarning(level, 'Salary is missing!');
      }
      if (!level.tenure) {
        addWarning(level, 'Tenure is missing!');
      }
      if (!level.bonus && !level.commission && !level.variablePay) {
        addWarning(level, 'Variable pay, bonus, and commission are missing!');
      }
      if (!level.description) {
        addWarning(level, 'Description is missing!');
      } else {
        level.description = level.description
          .replace(/confluenceTh/g, 'fs-table_header')
          .replace(/<h1/g, '<h5')
          .replace(/<\/h1>/g, '</h5>');
      }

      // console.log(level);

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
