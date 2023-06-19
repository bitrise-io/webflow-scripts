import BambooHRService from "./careers/BambooHRService";
import JobDepartmentList from "./careers/JobDepartmentList";

const jobDepartmentList = new JobDepartmentList();

const bamboo = new BambooHRService();
bamboo.getJobs().then(jobs => {
  jobDepartmentList.render(jobs);
});