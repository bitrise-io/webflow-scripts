import { createSlug } from './tools';
import careerImages from './images';

class DepartmentSectionFactory {
  /**
   * @param {HTMLElement} templateElement
   */
  constructor(templateElement) {
    /** @type {HTMLElement} */
    this.templateElement = templateElement.cloneNode(true);
    this.templateElement.className = 'cm-loaded'; // remove .cm-loading
    this.templateElement.style.display = 'none';
  }

  /**
   *
   * @param {import('../career-maps').Department} department
   * @returns {HTMLElement}
   */
  createDepartmentSection(department) {
    /** @type {HTMLElement} */
    const departmentSection = this.templateElement.cloneNode(true);
    departmentSection.style.display = '';

    /** @type {HTMLElement} */
    const departmentNameElement = departmentSection.querySelector('[data-template-id="cm-department-name"]');
    departmentNameElement.textContent = departmentNameElement.textContent.replace('{department_name}', department.name);

    /** @type {HTMLElement} */
    const departmentDescriptionElement = departmentSection.querySelector(
      '[data-template-id="cm-department-description"]',
    );
    if (department.description) {
      departmentDescriptionElement.textContent = departmentDescriptionElement.textContent.replace(
        '{department_description}',
        department.description,
      );
    } else {
      departmentDescriptionElement.remove();
    }

    /** @type {HTMLElement} */
    const teamGrid = departmentSection.querySelector('[data-template-id="cm-team-grid"]');

    /** @type {HTMLElement} */
    const teamCardTemplate = teamGrid.querySelector('[data-template-id="cm-team"]').cloneNode(true);

    teamGrid.innerHTML = '';
    department.teams.forEach((team) => {
      if (team.jobs && Object.keys(team.jobs).length > 0) {
        /** @type {HTMLAnchorElement} */
        const teamCardElement = teamCardTemplate.cloneNode(true);
        teamCardElement.href = `/careers/maps/${team.slug}`;

        /** @type {HTMLElement} */
        const teamNameElement = teamCardElement.querySelector('[data-template-id="cm-team-name"]');
        teamNameElement.textContent = teamNameElement.textContent.replace('{team_name}', team.name);

        const teamIllustration = teamNameElement.nextSibling;
        teamIllustration.src = careerImages.getImageBySlug(team.slug.replace(/-/g, '_'));
        teamIllustration.alt = '';
        teamIllustration.removeAttribute('srcset');

        /** @type {HTMLElement} */
        const teamLinkElement = teamCardElement.querySelector('[data-template-id="cm-team-link"]');
        teamLinkElement.textContent = teamLinkElement.textContent.replace('{team_name}', team.name);
        teamLinkElement.href = `/careers/maps/${team.slug}`;

        /** @type {HTMLUListElement} */
        const teamJobListElement = teamCardElement.querySelector('[data-template-id="cm-team-job-list"]');
        /** @type {HTMLLIElement} */
        const teamJobListItemTemplate = teamJobListElement
          .querySelector('[data-template-id="cm-team-job-list-item"]')
          .cloneNode(true);
        teamJobListElement.innerHTML = '';
        Object.keys(team.jobs).forEach((jobName) => {
          /** @type {HTMLLIElement} */
          const teamJobListItemElement = teamJobListItemTemplate.cloneNode(true);
          /** @type {HTMLAnchorElement} */
          const teamJobListItemLinkElement = teamJobListItemElement.querySelector('a');
          teamJobListItemLinkElement.textContent = teamJobListItemLinkElement.textContent.replace(
            '{job_name}',
            jobName,
          );
          teamJobListItemLinkElement.href = `/careers/maps/${team.slug}/${createSlug(jobName)}`;
          teamJobListElement.appendChild(teamJobListItemElement);
        });

        teamGrid.appendChild(teamCardElement);
      }
    });

    return departmentSection;
  }
}

export default DepartmentSectionFactory;
