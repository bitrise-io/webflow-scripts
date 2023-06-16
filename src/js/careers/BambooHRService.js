import { getElementTextContent } from "../common";
import { BambooDepartment, BambooJobs, BambooPosition } from "./BambooHRModels";

class BambooHRService
{
  /** 
   * @param {HTMLElement} board
   * @returns {BambooJobs}
   */
  parseBambooJobs(board) {
    const bambooJobs = new BambooJobs();

    const departmentList = board.querySelector(".BambooHR-ATS-Department-List");
    departmentList.querySelectorAll(".BambooHR-ATS-Department-Item").forEach(departmentItem => {
      const departmentHeader = departmentItem.querySelector(".BambooHR-ATS-Department-Header");

      const department = new BambooDepartment(
        parseInt(departmentHeader.id.split("_")[1]), 
        getElementTextContent(departmentHeader)
      );

      departmentItem.querySelectorAll(".BambooHR-ATS-Jobs-Item").forEach(jobsItem => {
        department.posts.push(new BambooPosition(
          parseInt(jobsItem.id.split("_")[1]),
          jobsItem.querySelector("a").href,
          getElementTextContent(jobsItem.querySelector("a")),
          getElementTextContent(jobsItem.querySelector(".BambooHR-ATS-Location")),
          department.name
        ));
      });

      bambooJobs.departments.push(department); 
    });

    return bambooJobs;
  }

  /** @returns {Promise<BambooJobs>} */
  getJobs() {
    return new Promise((resolve, reject) => {
      var bambooHRContainer = document.createElement("div");
      bambooHRContainer.style.display = "none";
      bambooHRContainer.innerHTML = '<div id="BambooHR" data-domain="bitrise.bamboohr.com" data-version="1.0.0" data-departmentId=""></div>';
      document.querySelector('body').appendChild(bambooHRContainer);
    
      var bambooScript = document.createElement('script');
      bambooScript.setAttribute('src','https://bitrise.bamboohr.com/js/embed.js');
      document.head.appendChild(bambooScript);
    
      let bambooListener = window.setInterval(() => {
        const bambooHR = document.getElementById("BambooHR");
        if (bambooHR.querySelector(".BambooHR-ATS-board")) {
          window.clearInterval(bambooListener);
          resolve(this.parseBambooJobs(bambooHR.querySelector(".BambooHR-ATS-board")));
        }
      }, 200);  
    });
  }
}

export default BambooHRService;