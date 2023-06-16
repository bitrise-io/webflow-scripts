import { getFirstElementByClassname } from "../common";

class JobDepartmentList
{
  constructor() {
    /** @type {HTMLElement} */
    this.jobDeparmentListElement = getFirstElementByClassname(document, 'job-department-list');
    /** @type {HTMLElement} */
    this.jobDepartmentElementPrototype = getFirstElementByClassname(this.jobDeparmentListElement, 'job-department');
    this.jobDepartmentElementPrototype.parentNode.removeChild(this.jobDepartmentElementPrototype);
    
    /** @type {HTMLElement} */
    this.jobPostElementPrototype = getFirstElementByClassname(this.jobDepartmentElementPrototype, 'job-card');
    this.jobPostElementPrototype.parentNode.removeChild(this.jobPostElementPrototype);
    
    /** @type {HTMLElement} */
    this.jobTagElementPrototype = getFirstElementByClassname(this.jobPostElementPrototype, 'job-tag');
    const jobTagElements = this.jobPostElementPrototype.getElementsByClassName('job-tag');
    Array.from(jobTagElements).forEach(jobTagElement => jobTagElement.parentNode.removeChild(jobTagElement));
  }

  /**
   * @typedef {{
   *   name: string,
   *   isOpen: boolean,
   *   posts: {
   *     categories: {
   *       location: string|undefined,
   *       team: string|undefined
   *     },
   *     text: string,
   *     hostedUrl: string
   *   }[]
   * }} JobDepartment
   */

  /** @param {JobDepartment[]} jobDepartments */
  render(jobDepartments) {
    this.jobDeparmentListElement.replaceChildren();
    this.jobDeparmentListElement.style.display = 'block';
    
    jobDepartments.forEach(jobDepartment => {
      const jobDepartmentElement = this.jobDepartmentElementPrototype.cloneNode(true);
      const jobDeparmentHeaderElement = getFirstElementByClassname(jobDepartmentElement, 'job-department-header');
      jobDeparmentHeaderElement.addEventListener('click', event => {
        jobDepartment.isOpen = !jobDepartment.isOpen;
        
        const jobListWrapperElement = getFirstElementByClassname(jobDepartmentElement, 'job-list-wrapper');
        jobListWrapperElement.style.display = jobDepartment.isOpen ? 'block' : 'none';
        jobListWrapperElement.style.height = 'auto';
        
        const jobDepartmentCloseIconElement = getFirstElementByClassname(
          jobDepartmentElement,
          'job-department-close-icon',
        );
        jobDepartmentCloseIconElement.style.transform = jobDepartment.isOpen ? 'rotate(45deg)' : 'none';
      });
      
      const jobDeparmentNameElement = getFirstElementByClassname(jobDepartmentElement, 'job-department-name');
      jobDeparmentNameElement.innerHTML = jobDepartment.name;
      this.jobDeparmentListElement.appendChild(jobDepartmentElement);
      
      const jobPostListEmptyElement = getFirstElementByClassname(jobDepartmentElement, 'job-list-empty');
      const jobPostListElement = getFirstElementByClassname(jobDepartmentElement, 'job-list');
      if (jobDepartment.posts.length > 0) {
        jobPostListEmptyElement.parentNode.removeChild(jobPostListEmptyElement);
        
        jobDepartment.posts.forEach(jobPost => {
          const jobPostElement = this.jobPostElementPrototype.cloneNode(true);
          
          const jobPostLinkElement = getFirstElementByClassname(jobPostElement, 'job-link-wrapper');
          jobPostLinkElement.setAttribute('href', jobPost.hostedUrl);
          jobPostLinkElement.setAttribute('target', '_blank');
          
          const jobTitleElement = getFirstElementByClassname(jobPostElement, 'job-title');
          jobTitleElement.innerHTML = jobPost.text;
          
          const jobCardContentElement = getFirstElementByClassname(jobPostElement, 'job-card-content');
          [jobPost.categories.team, jobPost.categories.location].forEach(tag => {
            if (!tag) {
              return;
            }
            
            const jobTagElement = this.jobTagElementPrototype.cloneNode(true);
            jobTagElement.innerHTML = tag;
            
            jobCardContentElement.appendChild(jobTagElement);
          });
          
          jobPostListElement.appendChild(jobPostElement);
        });
      } else {
        jobPostListElement.parentNode.removeChild(jobPostListElement);
      }
    });
  }
}

export default JobDepartmentList;