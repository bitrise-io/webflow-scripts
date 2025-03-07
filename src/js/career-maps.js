import DepartmentSectionFactory from './career-maps/DepartmentSectionFactory';
import { fancyConsoleLog } from './shared/common';

import '../css/career-maps.css';

fancyConsoleLog('Bitrise.io Career Maps');

/**
 * @typedef {{
 *  name: string,
 *  description?: string,
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
 * @param {string} text
 * @returns {string}
 */
const createSlug = (text) => text.toLowerCase().replace(/ /g, '-');

const renderCareerMaps = (careerMaps) => {
  /** @type {HTMLElement} */
  const departmentTemplate = document.querySelector('[data-template-id="cm-department"]');

  /** @type {HTMLElement} */
  const departmentListContainer = departmentTemplate.parentNode;

  const dsf = new DepartmentSectionFactory(departmentTemplate);

  departmentListContainer.innerHTML = '';

  const loadingSection = dsf.createLoadingSection();
  departmentListContainer.appendChild(loadingSection);

  departmentListContainer.innerHTML = '';
  careerMaps.forEach((department) => {
    const departmentSection = dsf.createDepartmentSection(department);
    departmentListContainer.appendChild(departmentSection);
  });
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

let originalTemplateContainer = null;
let originalTemplateHTML = '';

(async () => {
  const response = await fetch('/careers/maps/data.json');
  /** @type {Department[]} */
  const careerMaps = await response.json();
  careerMaps.forEach((department) => {
    department.teams.forEach((team) => {
      team.slug = createSlug(team.name);
    });
  });

  if (document.location.pathname === '/careers/maps') {
    renderCareerMaps(careerMaps);
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

    const jobList = Object.keys(team.jobs).map((jobName) => {
      return {
        slug: createSlug(jobName),
        name: jobName,
        defaultLevelSlug: createSlug(Object.keys(team.jobs[jobName]).shift()),
      };
    });

    const templateContainer = document.querySelector('#cm-jobs-dropdown').parentNode;
    originalTemplateContainer = templateContainer;
    originalTemplateHTML = templateContainer.innerHTML;

    const jobsDropdown = templateContainer.querySelector('#cm-jobs-dropdown');
    jobsDropdown.querySelector('.w-dropdown-toggle .replace-text').textContent = job.name;
    const jobsDropownItemTemplate = jobsDropdown.querySelector('.w-dropdown-link').cloneNode(true);
    jobsDropdown.querySelector('.w-dropdown-list').innerHTML = '';
    jobList.forEach((jobListItem) => {
      const jobDropdownItem = jobsDropownItemTemplate.cloneNode(true);
      jobDropdownItem.textContent = jobListItem.name;
      jobDropdownItem.setAttribute('data-dropdown', jobListItem.slug);
      jobDropdownItem.href = `/careers/maps/${teamSlug}/${jobListItem.slug}/${jobListItem.defaultLevelSlug}`;
      jobsDropdown.querySelector('.w-dropdown-list').appendChild(jobDropdownItem);
    });
    jobsDropdown.querySelector('.w-dropdown-toggle').addEventListener('click', () => {
      jobsDropdown.classList.toggle('w--open');
    });
  }
})();

if (import.meta.webpackHot) {
  import.meta.webpackHot.dispose(() => {
    // if (originalTemplateContainer) {
    //   originalTemplateContainer.innerHTML = originalTemplateHTML;
    // }
  });
  import.meta.webpackHot.accept();
}
