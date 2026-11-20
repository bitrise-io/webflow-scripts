import DepartmentSectionFactory from './DepartmentSectionFactory';
import { jobNameOverride } from './overrides';
import { createSlug } from './tools';

/**
 * Renders the career maps into the Webflow templates. Runs in the browser and in the SSR job (JSDOM), so it only
 * works on the document it gets.
 */

const RENDER_FLAG = 'data-career-maps-rendered';

/**
 * True when the page was rendered by the SSR job, so the browser script does not have to render it again.
 * @param {Document} doc
 * @returns {boolean}
 */
export const isCareerMapsRendered = (doc) => doc.documentElement.hasAttribute(RENDER_FLAG);

/**
 * @param {Document} doc
 */
export const markCareerMapsRendered = (doc) => {
  doc.documentElement.setAttribute(RENDER_FLAG, 'true');
};

/**
 * The overview page: one section per department, with a card per team.
 * @param {Document} doc
 * @param {import('../career-maps').Department[]} departments - prepared with prepareCareerMaps
 * @returns {() => void} undoes the rendering
 */
export const renderOverview = (doc, departments) => {
  /** @type {HTMLElement} */
  const departmentTemplate = doc.querySelector('[data-template-id="cm-department"]');

  /** @type {HTMLElement} */
  const departmentListContainer = departmentTemplate.parentNode;
  const originalTemplateContent = departmentListContainer.innerHTML;

  const dsf = new DepartmentSectionFactory(departmentTemplate);

  departmentListContainer.innerHTML = '';
  departments.forEach((department) => {
    departmentListContainer.appendChild(dsf.createDepartmentSection(department));
  });

  return () => {
    departmentListContainer.innerHTML = originalTemplateContent;
  };
};

/**
 * @param {number} salary
 * @returns {string}
 */
const formatSalary = (salary) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(salary);

/**
 * @param {Document} doc
 * @param {import('../career-maps').Level} level
 * @param {string} pathname - the path of the page, for dropping the links that point into the page itself
 * @returns {() => void}
 */
const renderLevelDescription = (doc, level, pathname) => {
  const levelHeading = doc.querySelector('#cm-level-heading');
  levelHeading.textContent = level.name;

  const compensationSection = doc.querySelector('#cm-compensation-section');
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

  const salaryNotesElement = doc.getElementById('cm-salary-notes');
  const originalSalaryNotes = salaryNotesElement.textContent;
  if (level.salaryNotes) {
    salaryNotesElement.textContent = level.salaryNotes;
    salaryNotesElement.style.display = 'block';
  }

  Object.keys(level.salary || {}).forEach((country) => {
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
  bonusValueElement.classList.add('is-white');

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

  if (level.bonusNotes) {
    const bonusNotesElement = doc.createElement('p');
    bonusNotesElement.className = 'cm-bonus-notes';
    bonusNotesElement.textContent = level.bonusNotes;
    compensationSection.appendChild(bonusNotesElement);
  }

  const tenureSection = doc.querySelector('#cm-tenure-section');
  if (level.tenure) {
    tenureSection.querySelector('#cm-tenure-description').innerHTML = level.tenure;
  } else {
    tenureSection.style.display = 'none';
  }

  const wayOfWorkingSection = doc.querySelector('#cm-way-of-working-section');
  wayOfWorkingSection.querySelector('#cm-way-of-working-description').innerHTML = (level.description || '')
    .replaceAll(/<(\/?)h(3|4|5|6)/g, '<$1h6')
    .replaceAll(/<(\/?)h2/g, '<$1h5');
  [...wayOfWorkingSection.querySelectorAll('a')].forEach((link) => {
    if (link.href.match(/bitrise\.atlassian\.net/)) {
      link.replaceWith(link.textContent);
    } else if (link.href.match(`${pathname}#`)) {
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

  return () => {
    const existingBonusNotesElement = compensationSection.querySelector('.cm-bonus-notes');
    if (existingBonusNotesElement) {
      existingBonusNotesElement.remove();
    }
    salaryNotesElement.textContent = originalSalaryNotes;
  };
};

/**
 * @param {Document} doc
 * @param {HTMLElement} newTeamSidebarJobSection
 * @param {string} jobName
 * @param {import('./pages').CareerMapPage} page
 * @returns {HTMLElement}
 */
const renderTeamSidebarJobSection = (doc, newTeamSidebarJobSection, jobName, { team, level }) => {
  let isActiveJobSection = false;

  const teamSidebarJobSectionHeading = newTeamSidebarJobSection.querySelector('#cm-team-sidebar-job-heading');
  teamSidebarJobSectionHeading.textContent = teamSidebarJobSectionHeading.textContent.replace(
    '{job_name}',
    jobNameOverride(jobName),
  );
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
    teamSidebarLevelsListItemLink.href = `/careers/maps/${team.slug}/${createSlug(jobName)}/${createSlug(levelShortName)}`;
    if (jobLevel.name === level.name) {
      teamSidebarLevelsListItemLink.className = teamSidebarLevelsListItemSelectedClassName;
      isActiveJobSection = true;
    }
    teamSidebarLevelsList.appendChild(teamSidebarLevelsListItem);
  });

  if (isActiveJobSection) {
    newTeamSidebarJobSection.style.display = 'block';
    const pageTitle = doc.querySelector('#cm-team-page-title');
    pageTitle.textContent = pageTitle.textContent.replace('{job_name}', jobNameOverride(jobName));
  } else {
    newTeamSidebarJobSection.style.display = 'none';
  }

  return newTeamSidebarJobSection;
};

/**
 * @param {Document} doc
 * @param {import('./pages').CareerMapPage} page
 * @returns {() => void}
 */
const renderTeamSidebar = (doc, page) => {
  const jobSidebar = doc.querySelector('#cm-team-sidebar');
  const jobSidebarOriginalContent = jobSidebar.innerHTML;

  const teamSidebarJobSection = jobSidebar.querySelector('#cm-team-sidebar-job-section');
  const teamSidebarJobSectionContainer = teamSidebarJobSection.parentNode;
  const teamSidebarJobSectionTemplate = teamSidebarJobSection.cloneNode(true);
  teamSidebarJobSectionTemplate.removeAttribute('id');
  teamSidebarJobSectionContainer.innerHTML = '';

  Object.keys(page.team.jobs).forEach((jobName) => {
    teamSidebarJobSectionContainer.appendChild(
      renderTeamSidebarJobSection(doc, teamSidebarJobSectionTemplate.cloneNode(true), jobName, page),
    );
  });

  return () => {
    jobSidebar.innerHTML = jobSidebarOriginalContent;
  };
};

/**
 * The menu button of the sidebar on small screens. Event handlers do not survive the SSR job, so the browser script
 * calls this on every level page, rendered or not.
 * @param {Document} doc
 */
export const bindSidebarToggle = (doc) => {
  const jobSidebar = doc.querySelector('#cm-team-sidebar');
  const toggleButton = jobSidebar && jobSidebar.querySelector('#cm-sidebar-toggle');
  if (!toggleButton) return;
  toggleButton.addEventListener('click', () => {
    const divider = jobSidebar.querySelector('.cm-sidebar-divider');
    const list = jobSidebar.querySelector('.cm-sidebar-list');
    const isHidden = divider.style.display === '' || divider.style.display === 'none';
    divider.style.display = isHidden ? 'block' : 'none';
    list.style.display = isHidden ? 'block' : 'none';
  });
};

/**
 * A level page: the team title, the sidebar with the levels of every job of the team, and the level itself.
 * @param {Document} doc
 * @param {import('./pages').CareerMapPage} page
 * @returns {() => void} undoes the rendering
 */
export const renderTeamPage = (doc, page) => {
  const resets = [];

  doc.querySelector('.cm-loading').className = 'cm-loaded';
  resets.push(() => {
    doc.querySelector('.cm-loaded').className = 'cm-loading';
  });

  const pageTitle = doc.querySelector('#cm-team-page-title');
  pageTitle.textContent = pageTitle.textContent.replace('{team_name}', page.team.name);
  resets.push(renderTeamSidebar(doc, page));
  resets.push(renderLevelDescription(doc, page.level, `/careers/maps/${page.path}`));

  return () => {
    while (resets.length) resets.pop()();
  };
};

/**
 * The title, description and canonical URL of a level page, for the head of the document.
 * @param {import('./pages').CareerMapPage} page
 * @returns {{ title: string, description: string, canonical: string }}
 */
export const levelPageMeta = ({ team, level, path }) => ({
  title: `${level.name} | ${team.name} career map | Bitrise`,
  description: `Expectations, way of working and salary ranges of the ${level.name} level in the ${team.name} team at Bitrise.`,
  canonical: `https://bitrise.io/careers/maps/${path}`,
});

/**
 * @param {Document} doc
 * @param {{ title: string, description: string, canonical: string }} meta
 */
export const applyPageMeta = (doc, { title, description, canonical }) => {
  doc.title = title;
  const setContent = (selector, value) => {
    const element = doc.querySelector(selector);
    if (element) element.setAttribute('content', value);
  };
  setContent('meta[name="description"]', description);
  setContent('meta[property="og:title"]', title);
  setContent('meta[property="og:description"]', description);
  setContent('meta[name="twitter:title"]', title);
  setContent('meta[name="twitter:description"]', description);
  const canonicalLink = doc.querySelector('link[rel="canonical"]');
  if (canonicalLink) canonicalLink.setAttribute('href', canonical);
};
