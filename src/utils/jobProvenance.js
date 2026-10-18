export function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function buildJobProvenance(job) {
  return {
    sourceUrl: safeSourceUrl(job.sourceUrl),
    lastObservedAt: job.lastSeenAt || job.scrapedAt || null,
    classificationMethod: 'Automated classification for discovery; the employer determines eligibility.',
    experienceStatement: job.sourceExperienceRequired || null,
    employmentStatement: job.sourceEmploymentType || null,
    humanReviewed: false,
  };
}
