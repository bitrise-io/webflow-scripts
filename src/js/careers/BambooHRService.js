import { getElementTextContent } from "../common";
import { Department, Position } from "./CareersModels";

class BambooHRService
{
  /** 
   * @param {HTMLElement} board
   * @returns {Department[]}
   */
  parseBambooJobs(board) {
    /** @type {Department[]} */
    const bambooJobs = [];

    const departmentList = board.querySelector(".BambooHR-ATS-Department-List");
    departmentList.querySelectorAll(".BambooHR-ATS-Department-Item").forEach(departmentItem => {
      const departmentHeader = departmentItem.querySelector(".BambooHR-ATS-Department-Header");

      const department = new Department(
        getElementTextContent(departmentHeader),
        parseInt(departmentHeader.id.split("_")[1]) 
      );

      departmentItem.querySelectorAll(".BambooHR-ATS-Jobs-Item").forEach(jobsItem => {
        department.posts.push(new Position(
          jobsItem.querySelector("a").href,
          getElementTextContent(jobsItem.querySelector("a")),
          getElementTextContent(jobsItem.querySelector(".BambooHR-ATS-Location")),
          department.name,
          parseInt(jobsItem.id.split("_")[1])
        ));
      });

      bambooJobs.push(department); 
    });

    return bambooJobs;
  }

  /** @returns {Promise<Department[]>} */
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