import { PREFERRED_JOB_TYPES } from '../constants/preferredJobTypes.js';

export const PUBLIC_JOB_TYPES = PREFERRED_JOB_TYPES;

// Keep uncertainty in classification metadata, not in the public job taxonomy.
export const normalizePublicJobType = value => {
  const label = String(value ?? '').trim().toLowerCase();
  if (label === 'internship') return 'Intern';
  return PUBLIC_JOB_TYPES.find(type => type.toLowerCase() === label) || 'Full-time Experienced';
};
