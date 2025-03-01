import DepartmentSectionFactory from './career-maps/DepartmentSectionFactory';
import { fancyConsoleLog } from './shared/common';

import '../css/career-maps.css';

fancyConsoleLog('Bitrise.io Career Maps');

(async () => {
  /** @type {HTMLElement} */
  const departmentTemplate = document.querySelector('[data-template-id="cm-department"]');
  /** @type {HTMLElement} */
  const departmentListContainer = departmentTemplate.parentNode;

  const dsf = new DepartmentSectionFactory(departmentTemplate);

  departmentListContainer.innerHTML = '';

  const loadingSection = dsf.createLoadingSection();
  departmentListContainer.appendChild(loadingSection);

  const response = await fetch('/careers/maps/data.json');
  /** @type {import('./career-maps/DepartmentSectionFactory').Department[]} */
  const careerMaps = await response.json();

  departmentListContainer.innerHTML = '';
  careerMaps.forEach((department) => {
    const departmentSection = dsf.createDepartmentSection(department);
    departmentListContainer.appendChild(departmentSection);
  });
})();
