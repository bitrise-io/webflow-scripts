export const jobNameOverride = (jobName) => {
  switch (jobName) {
    case 'Product Marketing Manager':
      return 'Product Marketing';
    case 'Controlling Specialist':
      return 'Controlling';
    default:
      return jobName;
  }
};

// Job titles where the "seniority modifier" (Associate, Senior, Staff, ...) is actually part of
// the job title itself and must not be stripped by parseTeam's level-modifier removal.
export const jobTitlesKeepingModifier = ['Revenue Operations Associate'];

export const sameJobs = {
  Engineering: [['Software Engineer', 'Engineer']],
  Support: [['Customer Specialist'], ['Technical Specialist'], ['Technical Writer']],
  Sales: [
    ['Renewal Specialist', 'Renewal Representative'],
    ['Business Development Representative'],
    ['Account Executive', 'Sales Account Executive', 'Sales Representative'],
  ],
  People: [['People Operations'], ['Payroll']],
};
