import DepartmentSectionFactory from './career-maps/DepartmentSectionFactory';
import { fancyConsoleLog } from './shared/common';

import '../css/career-maps.css';
import { createSlug } from './career-maps/tools';

fancyConsoleLog('Bitrise.io Career Maps');

/**
 * @typedef {{
 *  name: string,
 *  description?: string,
 *  priority?: number,
 *  teams: Team[]
 * }} Department
 */

/**
 * @typedef {{
 *  name: string,
 *  slug: string,
 *  jobs: Record<string, Record<string, Level>>
 * }} Team
 */

/**
 * @typedef {{
 *  name: string,
 *  slug: string,
 *  levels: Level[]
 * }} Job
 */

/**
 * @typedef {{
 *  name: string,
 *  slug: string,
 *  salary: Record<string, SalaryRange>,
 *  bonus?: string,
 *  variablePay?: string,
 *  commission?: string,
 *  tenure: string,
 *  description: string,
 * }} Level
 */

/**
 * @typedef {{
 *  lowEnd: number,
 *  highEnd: number,
 * }} SalaryRange
 */

/**
 *
 * @param {Department[]} departments
 * @returns {() => void}
 */
const renderCareerMaps = (departments) => {
  /** @type {HTMLElement} */
  const departmentTemplate = document.querySelector('[data-template-id="cm-department"]');

  /** @type {HTMLElement} */
  const departmentListContainer = departmentTemplate.parentNode;
  const originalTemplateContent = departmentListContainer.innerHTML;

  const dsf = new DepartmentSectionFactory(departmentTemplate);

  departmentListContainer.innerHTML = '';
  departments.forEach((department) => {
    const departmentSection = dsf.createDepartmentSection(department);
    departmentListContainer.appendChild(departmentSection);
  });

  return () => {
    departmentListContainer.innerHTML = originalTemplateContent;
  };
};

/**
 * @param {Department[]} departments
 * @param {string} teamSlug
 * @returns {Team}
 */
const findTeamBySlug = (departments, teamSlug) => {
  return departments.reduce((acc, department) => {
    if (acc) return acc;
    return department.teams.find((team) => team.slug === teamSlug);
  }, null);
};

/**
 * @param {Team} team
 * @param {string | null} jobSlug
 * @returns {Job}
 */
const findJobBySlug = (team, jobSlug) => {
  if (jobSlug) {
    const job = Object.keys(team.jobs).find((jobName) => createSlug(jobName) === jobSlug);
    if (job) {
      return {
        name: job,
        slug: jobSlug,
        levels: Object.keys(team.jobs[job]).map((levelShortName) => {
          return {
            ...team.jobs[job][levelShortName],
            slug: createSlug(levelShortName),
          };
        }),
      };
    }
  }
  const defaultJobKey = Object.keys(team.jobs).shift();
  return {
    name: defaultJobKey,
    slug: createSlug(defaultJobKey),
    levels: Object.keys(team.jobs[defaultJobKey]).map((levelShortName) => {
      return {
        ...team.jobs[defaultJobKey][levelShortName],
        slug: createSlug(levelShortName),
      };
    }),
  };
};

/**
 * @param {Job} job
 * @param {string | null} levelSlug
 * @returns {Level}
 */
const findLevelBySlug = (job, levelSlug) => {
  if (levelSlug) {
    const level = job.levels.find((jobLevel) => jobLevel.slug === levelSlug);
    if (level) {
      return level;
    }
  }
  return job.levels[0];
};

/** @type {((() => void) | void)[]} */
const resetDocument = [];

/**
 *
 * @param {HTMLElement} templateContainer
 * @param {Team} team
 * @param {Job} job
 */
// const renderJobDropdown = (templateContainer, team, job) => {
//   const jobList = Object.keys(team.jobs).map((jobName) => {
//     return {
//       slug: createSlug(jobName),
//       name: jobName,
//       defaultLevelSlug: createSlug(Object.keys(team.jobs[jobName]).shift()),
//     };
//   });

//   const jobsDropdown = templateContainer.querySelector('#cm-jobs-dropdown');
//   jobsDropdown.querySelector('.w-dropdown-toggle .replace-text').textContent = job.name;
//   const jobsDropownItemTemplate = jobsDropdown.querySelector('.w-dropdown-link').cloneNode(true);
//   jobsDropdown.querySelector('.w-dropdown-list').innerHTML = '';
//   jobList.forEach((jobListItem) => {
//     const jobDropdownItem = jobsDropownItemTemplate.cloneNode(true);
//     jobDropdownItem.textContent = jobListItem.name;
//     jobDropdownItem.setAttribute('data-dropdown', jobListItem.slug);
//     jobDropdownItem.href = `/careers/maps/${team.slug}/${jobListItem.slug}/${jobListItem.defaultLevelSlug}`;
//     jobsDropdown.querySelector('.w-dropdown-list').appendChild(jobDropdownItem);
//   });
//   jobsDropdown.querySelector('.w-dropdown-toggle').addEventListener('click', () => {
//     jobsDropdown.classList.toggle('w--open');
//   });
// };

/**
 *
 * @param {HTMLElement} templateContainer
 * @param {Team} team
 * @param {Job} job
 * @param {Level} level
 * @returns {() => void}
 */
// const renderLevelTabs = (templateContainer, team, job, level) => {
//   const levelTabs = templateContainer.querySelector('#cm-level-tabs');
//   const originalTemplateContent = levelTabs.innerHTML;

//   const levelTabClassName = levelTabs.querySelector('#cm-level-tab').className;
//   const selectedLevelTabClassName = levelTabs.querySelector('#cm-level-tab-selected').className;
//   const levelTabTemplate = levelTabs.querySelector('#cm-level-tab').cloneNode(true);
//   levelTabTemplate.removeAttribute('id');

//   levelTabs.innerHTML = '';

//   job.levels.forEach((jobLevel) => {
//     const levelTab = levelTabTemplate.cloneNode(true);
//     levelTab.textContent = jobLevel.name;
//     levelTab.href = `/careers/maps/${team.slug}/${job.slug}/${jobLevel.slug}`;
//     levelTab.className = jobLevel.slug === level.slug ? selectedLevelTabClassName : levelTabClassName;
//     levelTabs.appendChild(levelTab);
//   });

//   return () => {
//     levelTabs.innerHTML = originalTemplateContent;
//   };
// };

/**
 *
 * @param {number} salary
 * @returns {string}
 */
const formatSalary = (salary) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(salary);
};

/**
 *
 * @param {Level} level
 */
const renderLevelDescription = (level) => {
  const levelHeading = document.querySelector('#cm-level-heading');
  levelHeading.textContent = level.name;

  const compensationSection = document.querySelector('#cm-compensation-section');
  const salaryTableContainer = compensationSection.querySelector('#cm-compensation-table');
  const salaryTable = salaryTableContainer.querySelector('table');
  if (salaryTable.querySelectorAll('thead th').length > 3) {
    salaryTable.querySelectorAll('thead th')[2].remove();
  }
  const salaryTableBody = salaryTable.querySelector('tbody');
  const salaryTableRowTemplate = salaryTableBody.querySelector('tr').cloneNode(true);
  salaryTableBody.innerHTML = '';
  if (salaryTableRowTemplate.querySelectorAll('td').length > 3) {
    salaryTableRowTemplate.querySelectorAll('td')[2].remove();
  }

  Object.keys(level.salary).forEach((country) => {
    if (!country.match(/(HUF|USD|GBP|US|UK|Hungary)/)) {
      return; // skip non-primary hiring locations
    }
    const salaryTableRow = salaryTableRowTemplate.cloneNode(true);
    salaryTableRow.querySelector('td').textContent = country;
    salaryTableRow.querySelectorAll('td')[1].textContent = formatSalary(level.salary[country].lowEnd);
    salaryTableRow.querySelectorAll('td')[2].textContent = formatSalary(level.salary[country].highEnd);
    salaryTableBody.appendChild(salaryTableRow);
  });

  const bonusTitleElement = compensationSection.querySelector('#cm-bonus-title');
  const bonusValueElement = compensationSection.querySelector('#cm-bonus-value');

  if (level.bonus) {
    bonusTitleElement.textContent = 'Bonus percentage';
    bonusValueElement.textContent = level.bonus;
  } else if (level.variablePay) {
    bonusTitleElement.textContent = 'Variable pay percentage';
    bonusValueElement.textContent = level.variablePay;
  } else if (level.commission) {
    bonusTitleElement.textContent = 'Commission percentage';
    bonusValueElement.textContent = level.commission;
  } else {
    bonusTitleElement.textContent = '';
    bonusValueElement.textContent = '';
  }

  const tenureSection = document.querySelector('#cm-tenure-section');
  if (level.tenure) {
    tenureSection.querySelector('#cm-tenure-description').innerHTML = level.tenure;
  } else {
    tenureSection.style.display = 'none';
  }

  const wayOfWorkingSection = document.querySelector('#cm-way-of-working-section');
  wayOfWorkingSection.querySelector('#cm-way-of-working-description').innerHTML = level.description
    .replaceAll(/<(\/?)h(3|4|5|6)/g, '<$1h6')
    .replaceAll(/<(\/?)h2/g, '<$1h5');
  [...wayOfWorkingSection.querySelectorAll('a')].forEach((link) => {
    if (link.href.match(/bitrise\.atlassian\.net/)) {
      link.replaceWith(link.textContent);
    } else if (link.href.match(`${window.location.pathname}#`)) {
      link.replaceWith(link.textContent);
    }
  });
  [...wayOfWorkingSection.querySelectorAll('table')].forEach((table) => {
    table.className = 'fs-table_table';
    [...table.querySelectorAll('tbody tr')].forEach((row) => {
      row.className = 'fs-table_row';
      if (row.querySelectorAll('th').length > 1) {
        row.querySelectorAll('th')[0].className = 'fs-table_header';
        row.querySelectorAll('th')[1].className = 'fs-table_header';
      } else if (row.querySelectorAll('th').length === 1 && row.querySelectorAll('th')[0].colSpan === 2) {
        row.querySelectorAll('th')[0].className = 'fs-table_header';
      } else if (row.querySelectorAll('td').length > 1) {
        row.querySelectorAll('td')[0].className = 'fs-table_header';
        if (row.querySelectorAll('td')[1].textContent.trim()) {
          row.querySelectorAll('td')[1].className = 'fs-table_cell is-white';
        } else {
          row.querySelectorAll('td')[0].colSpan =
            1 + (row.querySelectorAll('td')[1].colSpan ? row.querySelectorAll('td')[1].colSpan : 1);
          row.querySelectorAll('td')[1].remove();
        }
      } else if (row.querySelectorAll('td').length === 1 && row.querySelectorAll('td')[0].colSpan === 2) {
        row.querySelectorAll('td')[0].className = 'fs-table_header';
      } else {
        row.querySelectorAll('td')[0].className = 'fs-table_cell is-white';
      }
    });
  });
};

/**
 *
 * @param {HTMLElement} newTeamSidebarJobSection
 * @param {string} jobName
 * @param {Team} team
 * @param {Job} job
 * @param {Level} level
 * @returns {HTMLElement}
 */
const renderTeamSidebarJobSection = (newTeamSidebarJobSection, jobName, team, job, level) => {
  let isActiveJobSection = false;

  const teamSidebarJobSectionHeading = newTeamSidebarJobSection.querySelector('#cm-team-sidebar-job-heading');
  teamSidebarJobSectionHeading.textContent = teamSidebarJobSectionHeading.textContent.replace('{job_name}', jobName);
  teamSidebarJobSectionHeading.removeAttribute('id');

  const teamSidebarLevelsList = newTeamSidebarJobSection.querySelector('#cm-team-sidebar-level-list');
  teamSidebarLevelsList.removeAttribute('id');
  const teamSidebarLevelsListItemTemplate = teamSidebarLevelsList
    .querySelector('#cm-team-sidebar-level-item')
    .cloneNode(true);
  teamSidebarLevelsListItemTemplate.removeAttribute('id');
  const teamSidebarLevelsListItemSelectedClassName = teamSidebarLevelsListItemTemplate.querySelector('a').className;
  teamSidebarLevelsListItemTemplate.querySelector('a').className = '';
  teamSidebarLevelsList.innerHTML = '';
  Object.keys(team.jobs[jobName]).forEach((levelShortName) => {
    const jobLevel = team.jobs[jobName][levelShortName];
    const teamSidebarLevelsListItem = teamSidebarLevelsListItemTemplate.cloneNode(true);
    const teamSidebarLevelsListItemLink = teamSidebarLevelsListItem.querySelector('a');
    teamSidebarLevelsListItemLink.textContent = teamSidebarLevelsListItemLink.textContent.replace(
      '{level_name}',
      jobLevel.name,
    );
    teamSidebarLevelsListItemLink.href = `/careers/maps/${team.slug}/${job.slug}/${createSlug(levelShortName)}`;
    if (jobLevel.name === level.name) {
      teamSidebarLevelsListItemLink.className = teamSidebarLevelsListItemSelectedClassName;
      isActiveJobSection = true;
    }
    teamSidebarLevelsList.appendChild(teamSidebarLevelsListItem);
  });

  if (isActiveJobSection) {
    newTeamSidebarJobSection.style.display = 'block';
    document.querySelector('#cm-team-page-title').textContent = document
      .querySelector('#cm-team-page-title')
      .textContent.replace('{job_name}', jobName);
  } else {
    newTeamSidebarJobSection.style.display = 'none';
  }

  return newTeamSidebarJobSection;
};

/**
 *
 * @param {Team} team
 * @param {Job} job
 * @param {Level} level
 * @returns {() => void}
 */
const rednerTeamSidebar = (team, job, level) => {
  const jobSidebar = document.querySelector('#cm-team-sidebar');
  const jobSidebarOriginalContent = jobSidebar.innerHTML;

  const teamSidebarJobSection = jobSidebar.querySelector('#cm-team-sidebar-job-section');
  const teamSidebarJobSectionContainer = teamSidebarJobSection.parentNode;
  const teamSidebarJobSectionTemplate = teamSidebarJobSection.cloneNode(true);
  teamSidebarJobSectionTemplate.removeAttribute('id');
  teamSidebarJobSectionContainer.innerHTML = '';

  const teamSidebarToggleButton = jobSidebar.querySelector('#cm-sidebar-toggle');
  teamSidebarToggleButton.addEventListener('click', () => {
    const dividerDisplay = jobSidebar.querySelector('.cm-sidebar-divider').style.display;
    if (dividerDisplay === '' || dividerDisplay === 'none') {
      jobSidebar.querySelector('.cm-sidebar-divider').style.display = 'block';
      jobSidebar.querySelector('.cm-sidebar-list').style.display = 'block';
    } else {
      jobSidebar.querySelector('.cm-sidebar-divider').style.display = 'none';
      jobSidebar.querySelector('.cm-sidebar-list').style.display = 'none';
    }
  });

  Object.keys(team.jobs).forEach((jobName) => {
    const newTeamSidebarJobSection = renderTeamSidebarJobSection(
      teamSidebarJobSectionTemplate.cloneNode(true),
      jobName,
      team,
      job,
      level,
    );
    teamSidebarJobSectionContainer.appendChild(newTeamSidebarJobSection);
  });

  return () => {
    jobSidebar.innerHTML = jobSidebarOriginalContent;
  };
};

(async () => {
  const response = await fetch(`/careers/maps/data.json?v=${Date.now()}`);
  /** @type {Department[]} */
  const careerMaps = await response.json();
  careerMaps.forEach((department) => {
    department.teams.forEach((team) => {
      team.slug = createSlug(team.name);
    });
  });

  if (document.location.pathname.match(/^\/careers\/maps\/?$/)) {
    careerMaps.forEach((department) => {
      if (department.name === 'Research and Development') department.priority = 1;
      if (department.name === 'Go To Market') department.priority = 2;
      if (department.name === 'General & Administrative') {
        department.name = 'General and Administrative';
        department.priority = 3;
      }
      return department;
    });
    careerMaps.sort((a, b) => {
      if (a.priority && b.priority) {
        return a.priority - b.priority;
      }
      return a.name.localeCompare(b.name);
    });
    resetDocument.push(renderCareerMaps(careerMaps));
    return;
  }

  const teamPageMatch = document.location.pathname.match(/^\/careers\/maps\/([a-z0-9-/]+)?$/);
  if (teamPageMatch) {
    const teamPagePath = teamPageMatch[1].split('/');
    const [teamSlug] = teamPagePath;
    const team = findTeamBySlug(careerMaps, teamSlug);
    const job = findJobBySlug(team, teamPagePath.length > 1 ? teamPagePath[1] : null);
    const level = findLevelBySlug(job, teamPagePath.length > 2 ? teamPagePath[2] : null);

    if (document.location.pathname !== `/careers/maps/${teamSlug}/${job.slug}/${level.slug}`) {
      window.history.replaceState({}, '', `/careers/maps/${teamSlug}/${job.slug}/${level.slug}`);
    }

    // const templateContainer = document.querySelector('#cm-jobs-dropdown').parentNode;
    // resetDocument.push(renderJobDropdown(templateContainer, team, job));
    // resetDocument.push(renderLevelTabs(templateContainer, team, job, level));

    document.querySelector('.cm-loading').className = 'cm-loaded';
    resetDocument.push(() => {
      document.querySelector('.cm-loaded').className = 'cm-loading';
    });
    document.querySelector('#cm-team-page-title').textContent = document
      .querySelector('#cm-team-page-title')
      .textContent.replace('{team_name}', team.name);
    resetDocument.push(rednerTeamSidebar(team, job, level));
    resetDocument.push(renderLevelDescription(level));
  }
})();

if (import.meta.webpackHot) {
  import.meta.webpackHot.dispose(() => {
    while (resetDocument.length) {
      const resetFunction = resetDocument.pop();
      if (resetFunction) {
        resetFunction();
      }
    }
  });
  import.meta.webpackHot.accept();
}
