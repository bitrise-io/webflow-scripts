import DepartmentSectionFactory from './career-maps/DepartmentSectionFactory';
import { fancyConsoleLog } from './shared/common';

import '../css/career-maps.css';

fancyConsoleLog('Bitrise.io Career Maps');

(async () => {
  const departmentTemplate = document.querySelector('[data-template-id="cm-department"]');
  const departmentListContainer = departmentTemplate.parentNode;

  const dsf = new DepartmentSectionFactory(departmentTemplate);

  departmentListContainer.innerHTML = '';

  const loadingSection = dsf.createLoadingSection();
  departmentListContainer.appendChild(loadingSection);

  const response = await fetch('/careers.json');
  const careerMaps = await response.json();

  departmentListContainer.innerHTML = '';
  careerMaps.forEach((department) => {
    const departmentSection = dsf.createDepartmentSection(department);
    departmentListContainer.appendChild(departmentSection);
  });
})();
