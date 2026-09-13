import { applyPublicJobLocationScope } from './publicJobLocationScope.js';

// Full-time is the legacy alias of Full-time Experienced in the job taxonomy.
export const EXPERIENCED_JOB_TYPE = /^\s*full[\s_-]*time(?:[\s_-]+experienced)?\s*$/i;

export function applyPublicJobVisibility(filters = {}, siteSettings = {}) {
  const scoped = applyPublicJobLocationScope(filters);
  if (siteSettings.experiencedJobsEnabled !== false) return scoped;
  return { ...scoped, $nor: [...scoped.$nor, { jobType: EXPERIENCED_JOB_TYPE }] };
}
