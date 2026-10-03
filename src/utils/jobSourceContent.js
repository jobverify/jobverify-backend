/** Employer source is the only input to classification and derived job facts. */
export const getSourceDescription = (job = {}) => job.sourceDescription !== undefined
  ? String(job.sourceDescription ?? '')
  : String(job.jobDescription || job.description || '');

export const withSourceDescription = (job = {}) => {
  const description = getSourceDescription(job);
  const fields = typeof job.toObject === 'function' ? job.toObject() : job;
  return { ...fields, description, jobDescription: description };
};
