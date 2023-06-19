import { Department, Position } from "./CareersModels";

/**
 * @typedef {{
 *  categories: {
 *    commitment: string|undefined,
 *    department: string|undefined,
 *    location: string|undefined,
 *    team: string|undefined
 *  },
 *  hostedUrl: string,
 *  id: string,
 *  text: string,
 *  workplaceType: string
 * }} LeverPost
 */

class LeverService
{
  /** @returns {Promise<Department[]>} */
  getJobs() {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('GET', 'https://api.lever.co/v0/postings/bitrise', true);
      
      request.onload = function () {
        if (request.status < 200 || request.status >= 400) {
          reject();
        }
        
        /** @type {LeverPost[]} */
        const responsePayload = JSON.parse(this.response);
        /** @type {Department[]} */
        const jobDepartments = [];
        
        responsePayload.forEach(function (jobPost) {
          const jobDepartmentName = jobPost.categories.team || 'Other';
          
          let jobDepartment = jobDepartments.find(aJobDepartment => {
            return aJobDepartment.name === jobDepartmentName;
          });
          
          if (!jobDepartment) {
            jobDepartment = new Department(jobDepartmentName);
            jobDepartments.push(jobDepartment);
          }
          
          jobDepartment.posts.push(new Position(
            jobPost.hostedUrl,
            jobPost.text,
            jobPost.categories.location,
            jobPost.categories.team,
            jobPost.id
          ));
        });
        
        resolve(jobDepartments);
      };
      
      request.send();
    });
  }
}

export default LeverService;