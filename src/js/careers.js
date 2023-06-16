import BambooHRService from "./careers/BambooHRService";
import JobDepartmentList from "./careers/JobDepartmentList";
import LeverService from "./careers/LeverService";

const url = new URL(document.location.href);
const test = url.searchParams.get("test");

const jobDepartmentList = new JobDepartmentList();

if (test == null) {

  const lever = new LeverService();
  lever.getJobs().then(jobDepartments => {
    jobDepartmentList.render(jobDepartments);
  });    

} else {

  const bamboo = new BambooHRService();
  bamboo.getJobs().then(bambooJobs => {
    jobDepartmentList.render(bambooJobs.departments);
  });

}
