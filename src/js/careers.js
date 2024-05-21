import BambooHRService from './careers/BambooHRService';
import JobDepartmentList from './careers/JobDepartmentList';
import { fancyConsoleLog } from './shared/common';

const jobDepartmentList = new JobDepartmentList();

const bamboo = new BambooHRService();
bamboo.getJobs().then((jobs) => {
  jobDepartmentList.render(jobs);

  fancyConsoleLog('Bitrise.io Careers');
});

if (import.meta.webpackHot) {
  import.meta.webpackHot.dispose(() => {
    jobDepartmentList.reset();
  });
  import.meta.webpackHot.accept();
}
