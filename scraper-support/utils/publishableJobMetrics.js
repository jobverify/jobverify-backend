import { filterIndiaJobs } from './indiaLocationFilter.js'
import { isAggregateHiringSignalJob } from '../../src/utils/jobListingEvidence.js'
import {
  normalizeLifecycleDate,
  startOfUtcDay,
} from '../../src/utils/jobLifecycle.js'

export const normalizeHttpUrl = (value) => {
  try {
    const parsed = new URL(value)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

export const analyzePublishableJobs = (jobs = [], { now = new Date() } = {}) => {
  const resolvedNow = normalizeLifecycleDate(now) || new Date()
  const today = startOfUtcDay(resolvedNow)
  const filterCounts = {
    nonIndia: 0,
    old: 0,
    closed: 0,
    invalidUrl: 0,
    nonJob: 0,
  }

  const indiaJobs = filterIndiaJobs(jobs)
  filterCounts.nonIndia = Math.max(0, jobs.length - indiaJobs.length)

  const eligibleJobs = indiaJobs.filter((job) => {
    if (isAggregateHiringSignalJob(job)) {
      filterCounts.nonJob += 1
      return false
    }
    const applicationUrl = job?.applyUrl || job?.link || job?.sourceUrl
    // Email applications still have a navigable public role page. Persistence
    // uses that HTTP source URL when normalizing the application link.
    const emailSourceUrl = /^mailto:/i.test(String(applicationUrl || '').trim())
      ? normalizeHttpUrl(job?.sourceUrl) : null
    if (!normalizeHttpUrl(applicationUrl) && !emailSourceUrl) {
      filterCounts.invalidUrl += 1
      return false
    }

    const closingDate = normalizeLifecycleDate(job?.closingDate)
    if (closingDate && startOfUtcDay(closingDate) < today) {
      filterCounts.closed += 1
      return false
    }

    return true
  })

  return {
    now: resolvedNow,
    today,
    filterCounts,
    indiaJobs,
    eligibleJobs,
  }
}
