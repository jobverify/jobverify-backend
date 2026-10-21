import { hasSourceDescription } from '../../src/utils/jobSourceContent.js'

// Inspect the selected India roles separately from upstream enumeration. A
// complete list can still contain details that timed out or lack source text.
export function extractionDetailHealth(jobs = []) {
  let incompleteJobs = 0
  let missingDescriptions = 0
  const failureKinds = {}
  for (const job of jobs) {
    const missing = !hasSourceDescription(job)
    if (missing) missingDescriptions++
    if (missing || job.sourceDetailComplete === false || job.sourceListingComplete === false) {
      incompleteJobs++
      const kind = job.sourceDetailFailureKind || (missing ? 'missing-content' : job.sourceListingComplete === false ? 'listing-incomplete' : 'detail-incomplete')
      failureKinds[kind] = (failureKinds[kind] || 0) + 1
    }
  }
  return { complete: incompleteJobs === 0, inspectedJobs: jobs.length, incompleteJobs, missingDescriptions, failureKinds }
}
