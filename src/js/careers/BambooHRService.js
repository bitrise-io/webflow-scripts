import { getElementTextContent } from '../shared/common';
import Department from './Department';
import Position from './Position';

class BambooHRService {
  /**
   * @param {HTMLElement} board
   * @returns {Department[]}
   */
  parseBambooJobs(board) {
    /** @type {Department[]} */
    const bambooJobs = [];

    const departmentList = board.querySelector('.BambooHR-ATS-Department-List');
    departmentList.querySelectorAll('.BambooHR-ATS-Department-Item').forEach((departmentItem) => {
      const departmentHeader = departmentItem.querySelector('.BambooHR-ATS-Department-Header');

      const department = new Department(
        getElementTextContent(departmentHeader),
        parseInt(departmentHeader.id.split('_')[1], 10),
      );

      departmentItem.querySelectorAll('.BambooHR-ATS-Jobs-Item').forEach((jobsItem) => {
        department.posts.push(
          new Position(
            jobsItem.querySelector('a').href,
            getElementTextContent(jobsItem.querySelector('a')),
            getElementTextContent(jobsItem.querySelector('.BambooHR-ATS-Location')),
            department.name,
            parseInt(jobsItem.id.split('_')[1], 10),
          ),
        );
      });

      bambooJobs.push(department);
    });

    return bambooJobs;
  }

  /** @returns {Promise<Department[]>} */
  getJobs() {
    return new Promise((resolve) => {
      const bambooHRContainer = document.createElement('div');
      bambooHRContainer.style.display = 'none';
      bambooHRContainer.innerHTML =
        '<div id="BambooHR" data-domain="bitrise.bamboohr.com" data-version="1.0.0" data-departmentId=""></div>';
      document.querySelector('body').appendChild(bambooHRContainer);

      const bambooScript = document.createElement('script');
      bambooScript.setAttribute('src', 'https://bitrise.bamboohr.com/js/embed.js');
      document.head.appendChild(bambooScript);

      const bambooListener = window.setInterval(() => {
        const bambooHR = document.getElementById('BambooHR');
        if (bambooHR.querySelector('.BambooHR-ATS-board')) {
          window.clearInterval(bambooListener);
          resolve(this.parseBambooJobs(bambooHR.querySelector('.BambooHR-ATS-board')));
        }
      }, 200);
    });
  }
}

export default BambooHRService;
