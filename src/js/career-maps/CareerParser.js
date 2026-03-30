import { JSDOM } from 'jsdom';
import { sameJobs } from './overrides.js';

export const fetchConfluencePage = async (pageURL, { apiEmail, apiToken, bodyFormat = 'export_view' }) => {
  const pageId = pageURL.pathname.match(/pages\/(\d+)/)[1];
  const response = await fetch(`https://${pageURL.hostname}/wiki/api/v2/pages/${pageId}?body-format=${bodyFormat}`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiEmail}:${apiToken}`).toString('base64')}`,
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

const bonusPatterns = {
  bonus: /Bonus percentage for this position/i,
  variablePay: /Variable pay percentage for this position/i,
  commission: /Commission percentage for this position/i,
};

const getBonusRow = (element, bonusType) => {
  const labelPattern = bonusPatterns[bonusType];
  return [...element.querySelectorAll('tr')].find((row) =>
    [...row.querySelectorAll('th')].find((th) => th.textContent.match(labelPattern)),
  );
};

const hasBonus = (element, bonusType) => {
  return getBonusRow(element, bonusType) !== undefined;
};

const getBonusData = (element, bonusType) => {
  const bonusRow = getBonusRow(element, bonusType);
  if (bonusRow) {
    let dataCell;
    const bonusCells = bonusRow.querySelectorAll('td, th');
    if (bonusCells.length > 1) {
      [, dataCell] = bonusCells;
    } else {
      const labelPattern = bonusPatterns[bonusType];
      dataCell = [...bonusRow.querySelectorAll('th')].find((th) => th.textContent.match(labelPattern));
    }
    if (dataCell) {
      const data = dataCell.textContent.trim().replace(/,/, '.').replace(/ %/, '%');
      return data;
    }
  }
  return null;
};

const getTenureRow = (element) => {
  return [...element.querySelectorAll('tr')].find((row) =>
    [...row.querySelectorAll('th')].find((th) => th.textContent === 'Tenure'),
  );
};

const hasTenure = (element) => {
  return getTenureRow(element) !== undefined;
};

const getTenureData = (element) => {
  const tenureTableRow = getTenureRow(element);
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

const addWarning = (level, message, debug) => {
  level.warnings.push(message);
  if (debug) {
    process.stderr.write(`Warning in ${level.name}: ${message}\n`);
  }
};

export const parseLevel = async (levelPage, debug) => {
  const level = {};
  const levelPageDom = new JSDOM(levelPage.body);
  process.stdout.write('.');

  level.warnings = [];

  const elements = [...levelPageDom.window.document.querySelector('body').children].filter((element) =>
    element.textContent.trim(),
  );
  let element = elements.shift();
  let previusElementType = null;

  while (element) {
    // console.log('-------------------------------');
    // console.log(element.outerHTML);

    if (hasSalary(element)) {
      level.salary = getSalaryData(element);
      previusElementType = 'salary';
    } else if (hasBonus(element, 'variablePay')) {
      level.variablePay = getBonusData(element, 'variablePay');
      previusElementType = 'variablePay';
    } else if (hasBonus(element, 'bonus')) {
      level.bonus = getBonusData(element, 'bonus');
      previusElementType = 'bonus';
    } else if (hasBonus(element, 'commission')) {
      level.commission = getBonusData(element, 'commission');
      previusElementType = 'commission';
    } else if (hasTenure(element)) {
      level.tenure = getTenureData(element);
      previusElementType = 'tenure';
    } else if (
      ['variablePay', 'bonus', 'commission'].includes(previusElementType) &&
      element.tagName === 'P' &&
      element.textContent.trim()
    ) {
      level.bonusNotes = element.textContent.trim();
    } else if (element.textContent.match(/The HU ranges are provided as monthly salary/i)) {
      level.salaryNotes = element.textContent.trim();
    } else if (!element.outerHTML.match(/^<div class="confluence-information-macro/)) {
      if (!level.description) {
        level.description = '';
      }
      level.description += `${element.outerHTML}`;
    }

    element = elements.shift();
  }

  if (!level.salary || Object.keys(level.salary).length === 0) {
    addWarning(level, 'Salary is missing!', debug);
  }
  if (!level.tenure) {
    addWarning(level, 'Tenure is missing!', debug);
  }
  if (!level.bonus && !level.commission && !level.variablePay) {
    addWarning(level, 'Variable pay, bonus, and commission are missing!', debug);
  }
  if (!level.description) {
    addWarning(level, 'Description is missing!', debug);
  } else {
    level.description = level.description
      .replace(/confluenceTh/g, 'fs-table_header')
      .replace(/<h1/g, '<h5')
      .replace(/<\/h1>/g, '</h5>');
  }

  return level;
};

export const parseTeam = async (teamName, teamPage) => {
  const MAX_LEVEL = 6;
  const jobs = {};

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

      if (sameJobs[teamName]) {
        sameJobs[teamName].forEach((job) => {
          if (jobName.match(new RegExp(job.join('|'), 'i'))) {
            [jobName] = job;
          }
        });
      }

      if (!jobs[jobName]) jobs[jobName] = {};
      jobs[jobName][levelMatch[0]] = {
        name: link.textContent,
        link: link.href,
      };
    }
  });

  return jobs;
};

export const parseMain = async (mainPage) => {
  const dom = new JSDOM(mainPage.body);

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

  return { departments, flatTeams };
};
