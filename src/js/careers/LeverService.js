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

/**
 * @typedef {{
 *  name: string,
 *  posts: LeverPost[],
 *  isOpen: boolean
 * }} LeverDepartment
 */

class LeverService
{
  /** @returns {Promise<LeverDepartment[]>} */
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
        /** @type {LeverDepartment[]} */
        const jobDepartments = [];
        
        responsePayload.forEach(function (jobPost) {
          const jobDepartmentName = jobPost.categories.team || 'Other';
          
          let jobDepartment = jobDepartments.find(function (aJobDepartment) {
            return aJobDepartment.name === jobDepartmentName;
          });
          
          if (!jobDepartment) {
            jobDepartment = {
              name: jobDepartmentName,
              posts: [],
              isOpen: false,
            };
            jobDepartments.push(jobDepartment);
          }
          
          jobDepartment.posts.push(jobPost);
        });
        
        resolve(jobDepartments);
      };
      
      request.send();
    });
  }
}

export default LeverService;