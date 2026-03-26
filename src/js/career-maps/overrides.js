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
