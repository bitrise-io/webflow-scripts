class DepartmentSectionFactory {
  /**
   * @param {HTMLElement} templateElement
   */
  constructor(templateElement) {
    /** @type {HTMLElement} */
    this.templateElement = templateElement.cloneNode(true);
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

        /** @type {HTMLElement} */
        const teamLinkElement = teamCardElement.querySelector('[data-template-id="cm-team-link"]');
        teamLinkElement.textContent = teamLinkElement.textContent.replace('{team_name}', team.name);

        teamGrid.appendChild(teamCardElement);
      }
    });

    return departmentSection;
  }

  /**
   * Creates a loading skeleton for the department section
   * @returns {HTMLElement}
   */
  createLoadingSection() {
    /** @type {HTMLElement} */
    const loadingSection = this.templateElement.cloneNode(true);
    loadingSection.style.display = '';

    /** @type {HTMLElement} */
    const departmentNameElement = loadingSection.querySelector('[data-template-id="cm-department-name"]');
    departmentNameElement.innerHTML = '<span class="cm-loading">Loading department...</span>';

    /** @type {HTMLElement} */
    const departmentDescriptionElement = loadingSection.querySelector('[data-template-id="cm-department-description"]');
    departmentDescriptionElement.remove();

    /** @type {HTMLElement} */
    const teamGrid = loadingSection.querySelector('[data-template-id="cm-team-grid"]');

    /** @type {HTMLElement} */
    const teamCardTemplate = teamGrid.querySelector('[data-template-id="cm-team"]').cloneNode(true);

    teamGrid.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      /** @type {HTMLAnchorElement} */
      const teamCardElement = teamCardTemplate.cloneNode(true);
      teamCardElement.href = '#javascript:void(0)';
      teamCardElement.className += ' cm-loading';
      teamGrid.appendChild(teamCardElement);
    }

    return loadingSection;
  }
}

export default DepartmentSectionFactory;
