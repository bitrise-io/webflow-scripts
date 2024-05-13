import { getFirstElementByClassname } from "../shared/common";
import { Department } from "./CareersModels";

class JobDepartmentList
{
  constructor() {
    /** @type {HTMLElement} */
    this.jobDeparmentListElement = getFirstElementByClassname(document, 'job-department-list');
    this.originalContent = this.jobDeparmentListElement.innerHTML;

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

  /** @param {Department[]} jobDepartments */
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
          jobPostLinkElement.setAttribute('href', jobPost.url);
          jobPostLinkElement.setAttribute('target', '_blank');
          
          const jobTitleElement = getFirstElementByClassname(jobPostElement, 'job-title');
          jobTitleElement.innerHTML = jobPost.title;
          
          const jobCardContentElement = getFirstElementByClassname(jobPostElement, 'job-card-content');
          jobPost.tags.forEach(tag => {
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

  reset() {
    this.jobDeparmentListElement.innerHTML = this.originalContent;
  }
}

export default JobDepartmentList;