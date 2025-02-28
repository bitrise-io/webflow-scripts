class DepartmentSectionFactory {
  constructor(templateElement) {
    this.templateElement = templateElement.cloneNode(true);
    this.templateElement.style.display = 'none';
  }

  createDepartmentSection(department) {
    const departmentSection = this.templateElement.cloneNode(true);
    departmentSection.style.display = '';
    departmentSection.querySelector('[data-template-id="cm-department-name"]').textContent = department.name;
    if (department.description) {
      departmentSection.querySelector('[data-template-id="cm-department-description"]').textContent =
        department.description;
    } else {
      departmentSection.querySelector('[data-template-id="cm-department-description"]').remove();
    }

    const teamGrid = departmentSection.querySelector('[data-template-id="cm-team-grid"]');
    const teamLinkTemplate = teamGrid.querySelector('[data-template-id="cm-team"]').cloneNode(true);
    teamGrid.innerHTML = '';
    department.teams.forEach((team) => {
      const teamLink = teamLinkTemplate.cloneNode(true);
      teamLink.querySelector('[data-template-id="cm-team-name"]').textContent = team.name;
      teamLink.href = `/careers/maps/${team.name.toLowerCase().replace(/ /g, '-')}`;
      teamGrid.appendChild(teamLink);
    });

    return departmentSection;
  }

  createLoadingSection() {
    const loadingSection = this.templateElement.cloneNode(true);
    loadingSection.style.display = '';
    loadingSection.querySelector('[data-template-id="cm-department-name"]').innerHTML =
      '<span class="cm-loading">Loading department...</span>';
    loadingSection.querySelector('[data-template-id="cm-department-description"]').remove();

    const teamGrid = loadingSection.querySelector('[data-template-id="cm-team-grid"]');
    const teamLinkTemplate = teamGrid.querySelector('[data-template-id="cm-team"]').cloneNode(true);
    teamGrid.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const teamLink = teamLinkTemplate.cloneNode(true);
      teamLink.querySelector('[data-template-id="cm-team-name"]').textContent = 'Loading...';
      teamLink.href = '#';
      teamLink.className += ' cm-loading';
      teamGrid.appendChild(teamLink);
    }

    return loadingSection;
  }
}

export default DepartmentSectionFactory;
