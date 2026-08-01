/**
 * @file Persists scraped jobs to MongoDB with upsert-based deduplication.
 * @module scraper/utils/saveToDB
 */

import crypto from 'crypto'
import mongoose from 'mongoose'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { normalizeCity } from './cityNormalizer.js'
import { filterIndiaJobs } from './indiaLocationFilter.js'
import { getValidIndiaCityForJob } from '../../src/utils/publicJobLocationScope.js'
import {
  formatStoredLocationLabel,
  getPrimaryStoredLocation,
  normalizeStoredLocations,
} from '../../src/utils/jobLocations.js'
import { buildJobSearchKeys } from '../../src/utils/jobSearchKeys.js'
import { buildJobDerivedFields } from '../../src/utils/jobDerivedFields.js'
import {
  buildJobPostedAtCutoff,
  normalizeLifecycleDate,
  resolveJobMissesBeforeExpiry,
  resolveJobPostedAt,
  resolveJobRetentionDays,
  startOfUtcDay,
} from '../../src/utils/jobLifecycle.js'
import { normalizeScrapedJob, resolveJobType } from './normalizeScrapedJob.js'
import { enrichJobsWithPublicExperience } from './publicExperienceEnrichment.js'
import { jobAlertService } from '../../src/services/jobAlertService.js'
import { refreshJobDatasetSummary } from '../../src/services/jobDatasetSummaryService.js'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') })

// Lazy-load Job to avoid circular import issues when this module is used standalone
let Job
const getJobModel = async () => {
  if (!Job) {
    const { default: model } = await import('../../src/models/Job.js')
    Job = model
  }
  return Job
}

const ensureConnected = async () => {
  if (mongoose.connection.readyState === 0) {
    const { default: connectDB } = await import('../../db/db.js')
    await connectDB()
  }
}

const hasLiveDatabaseHandle = () => mongoose.connection.readyState === 1 && mongoose.connection.db != null

/**
 * Generates a stable fingerprint for a job based on its semantic identity.
 * Strategy: SHA-256(company | title | canonicalCity) — normalised to lowercase.
 *
 * Using the CANONICAL city means Bangalore and Bengaluru produce the same
 * fingerprint — the same job posted by different scrapers is correctly deduped.
 */
export const generateFingerprint = (job) => {
  const primaryLocation = getPrimaryStoredLocation(job)
  const canonicalCity = normalizeCity(primaryLocation || job.city || job.location || '') || ''
  const identity =
    normalizeHttpUrl(job.applyUrl || job.sourceUrl || job.link)
    || job.requisitionId
    || job.jobId
    || job.title
  const raw = [
    (job.company || '').toLowerCase().trim(),
    String(identity || '').toLowerCase().trim(),
    canonicalCity.toLowerCase(),
  ].join('|')
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/**
 * Saves an array of scraped jobs to MongoDB.
 *
 * - Upserts the latest scraped set for the scraper source first.
 * - Soft-expires unseen jobs only after consecutive successful scraper misses.
 * - Keeps jobs with no posted date, because the scraper cannot prove they are stale.
 * - Drops scraped jobs whose posted date is older than the retention window.
 *
 * @param {object[]} jobs   Array of job objects from a scraper's run()
 * @param {string}   source Scraper identifier e.g. 'airbus', 'rubrik', 'google'
 * @param {object}   options Optional persistence controls
 * @returns {{ inserted: number, updated: number, deleted: number, filteredOld: number }}
 */
// Infers a job type from title keywords since career pages rarely expose it as structured data.
const inferJobType = (title = '') => {
  const t = title.toLowerCase()
  if (/intern|internship|trainee|apprentice/i.test(t)) return 'Internship'
  if (/contract|contractor|freelance/i.test(t)) return 'Contract'
  if (/part.?time/i.test(t)) return null
  return 'Full-time'
}

// Returns true for senior/experienced roles that should never be stored.
const isSeniorRole = (title = '') =>
  /\b(senior|sr\.?|lead|principal|staff|manager|director|head\s+of|vp|vice\s+president|architect|distinguished|fellow|executive)\b/i.test(title)

const normalizeHttpUrl = (value) => {
  try {
    const parsed = new URL(value)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

export const saveToDB = async (jobs, source, options = {}) => {
  await ensureConnected()
  const JobModel = await getJobModel()

  const now = normalizeLifecycleDate(options.now) || new Date()
  const retentionDays = resolveJobRetentionDays(
    options.retentionDays ?? process.env.SCRAPER_JOB_POSTED_WITHIN_DAYS,
  )
  const missesBeforeExpiry = resolveJobMissesBeforeExpiry(
    options.missesBeforeExpiry ?? process.env.SCRAPER_JOB_MISSES_BEFORE_EXPIRY,
  )
  const postedAtCutoff = buildJobPostedAtCutoff(now, retentionDays)
  const today = startOfUtcDay(now)
  const filterCounts = {
    nonIndia: 0,
    old: 0,
    closed: 0,
    senior: 0,
    invalidUrl: 0,
  }

  const indiaJobs = filterIndiaJobs(jobs)
  filterCounts.nonIndia = Math.max(0, jobs.length - indiaJobs.length)

  const eligibleJobs = indiaJobs.filter((job) => {
    if (isSeniorRole(job.title)) {
      filterCounts.senior++
      return false
    }
    if (!normalizeHttpUrl(job.applyUrl || job.link || job.sourceUrl)) {
      filterCounts.invalidUrl++
      return false
    }
    const postedAt = resolveJobPostedAt(job)
    if (postedAt && startOfUtcDay(postedAt) < postedAtCutoff) {
      filterCounts.old++
      return false
    }
    const closingDate = normalizeLifecycleDate(job.closingDate)
    if (closingDate && startOfUtcDay(closingDate) < today) {
      filterCounts.closed++
      return false
    }
    return true
  })

  const jobsForPersistence = options.enrichPublicExperience === false
    ? eligibleJobs
    : await enrichJobsWithPublicExperience(eligibleJobs, {
        fetchText: options.fetchText,
        concurrency: options.experienceEnrichmentConcurrency,
      })

  const operations = jobsForPersistence.map((job) => {
    const normalizedJob = normalizeScrapedJob(job, { source })
    const fingerprint = generateFingerprint(normalizedJob)
    const sourceUrl = normalizeHttpUrl(normalizedJob.sourceUrl)
    const applyUrl = normalizeHttpUrl(normalizedJob.applyUrl) || sourceUrl
    const postedAt = resolveJobPostedAt(normalizedJob)
    const closingDate = normalizeLifecycleDate(normalizedJob.closingDate)
    const locations = normalizeStoredLocations(normalizedJob)
    const locationLabel = formatStoredLocationLabel(normalizedJob)
    const finalCity = getValidIndiaCityForJob(normalizedJob)
    const persistedJob = {
      ...normalizedJob,
      location: locationLabel || normalizedJob.location || null,
      locations,
      city: finalCity,
      postedAt,
      scrapedAt: normalizedJob.scrapedTimestamp || now,
    }
    const searchKeys = buildJobSearchKeys(persistedJob)
    const derivedFields = buildJobDerivedFields(persistedJob)

    return {
      updateOne: {
        filter: { fingerprint },
        update: {
          $set: {
            title: normalizedJob.title,
            company: normalizedJob.company,
            companyKey: searchKeys.companyKey,
            originalTitle: normalizedJob.originalTitle,
            normalizedTitle: normalizedJob.normalizedTitle,
            jobCategory: normalizedJob.jobCategory,
            engineeringDomain: normalizedJob.engineeringDomain,
            employmentType: normalizedJob.employmentType,
            experienceLevel: normalizedJob.experienceLevel,
            department: normalizedJob.department || null,
            location: locationLabel || normalizedJob.location || null,
            locations,
            city: finalCity,
            cityKey: searchKeys.cityKey,
            locationKeys: searchKeys.locationKeys,
            sortDate: derivedFields.sortDate,
            isPublicIndia: derivedFields.isPublicIndia,
            publicCityKey: derivedFields.publicCityKey,
            state: normalizedJob.state,
            country: normalizedJob.country,
            remoteStatus: normalizedJob.remoteStatus,
            source: normalizedJob.source || source,
            sourceUrl,
            applyUrl,
            companyCareerPage: normalizedJob.companyCareerPage,
            companyDomain: normalizedJob.companyDomain,
            atsPlatform: normalizedJob.atsPlatform,
            jobId: normalizedJob.jobId,
            requisitionId: normalizedJob.requisitionId,
            description: normalizedJob.jobDescription,
            minimumQualification: normalizedJob.minimumQualification,
            preferredQualification: normalizedJob.preferredQualification,
            requiredSkills: normalizedJob.requiredSkills,
            experienceRequired: normalizedJob.experienceRequired,
            salary: normalizedJob.salary,
            skillIds: normalizedJob.skillIds || [],
            requiredSkillIds: normalizedJob.requiredSkillIds || [],
            preferredSkillIds: normalizedJob.preferredSkillIds || [],
            jobSkills: normalizedJob.jobSkills || [],
            experienceBucket: normalizedJob.experienceBucket || 'unspecified',
            experienceYears: normalizedJob.experienceYears || [],
            experienceProfile: normalizedJob.experienceProfile || {},
            seniority: normalizedJob.seniority || 'Unknown',
            primaryRoleDomain: normalizedJob.primaryRoleDomain || 'Other',
            secondaryRoleDomains: normalizedJob.secondaryRoleDomains || [],
            workArrangement: normalizedJob.workArrangement || 'Not specified',
            filterSignals: normalizedJob.filterSignals || {},
            taxonomyVersion: normalizedJob.taxonomyVersion || null,
            extractionVersion: normalizedJob.extractionVersion || null,
            extractedAt: normalizedJob.extractedAt || now,
            fingerprint,
            scrapedAt: now,
            scrapedTimestamp: normalizedJob.scrapedTimestamp || now,
            lastSeenAt: now,
            missedScrapeCount: 0,
            status: 'active',
            jobType: resolveJobType(normalizedJob) || inferJobType(normalizedJob.title),
            // Only persist date fields when the scraper could parse them —
            // never overwrite a known date with null on a subsequent re-scrape.
            ...(postedAt && { postedAt }),
            ...(closingDate && { closingDate }),
          },
        },
        upsert: true,
      },
    }
  })

  const result = {
    inserted: 0,
    updated: 0,
    deleted: 0,
    filteredNonIndia: filterCounts.nonIndia,
    filteredOld: filterCounts.old,
    filteredClosed: filterCounts.closed,
    filteredSenior: filterCounts.senior,
    filteredInvalidUrl: filterCounts.invalidUrl,
    missed: 0,
    expired: 0,
    eligibleJobs: eligibleJobs.length,
    retentionDays,
    missesBeforeExpiry,
    postedAtCutoff: postedAtCutoff.toISOString(),
    staleCheckSkipped: false,
    staleCheckReason: null,
  }

  const currentFingerprints = operations.map((operation) => operation.updateOne.filter.fingerprint)

  if (operations.length > 0) {
    const bulkResult = await JobModel.bulkWrite(operations, { ordered: false })
    result.inserted = bulkResult.upsertedCount ?? 0
    result.updated = bulkResult.modifiedCount ?? 0

    const upsertedIndexes = Object.keys(bulkResult.upsertedIds ?? {})
      .map((key) => Number.parseInt(key, 10))
      .filter(Number.isInteger)
    const insertedFingerprints = upsertedIndexes
      .map((index) => operations[index]?.updateOne?.filter?.fingerprint)
      .filter(Boolean)

    if (insertedFingerprints.length > 0) {
      const insertedJobs = await JobModel.find({
        fingerprint: { $in: insertedFingerprints },
        status: 'active',
      })
        .lean()
        .exec()

      jobAlertService.enqueueJobAlertsForJobs(insertedJobs)
    }
  }

  let shouldRefreshDatasetSummary = operations.length > 0
  const authoritativeEmpty = currentFingerprints.length === 0
    && options.authoritativeEmpty === true

  if (
    options.replaceExisting !== false
    && currentFingerprints.length === 0
    && !authoritativeEmpty
  ) {
    result.staleCheckSkipped = true
    result.staleCheckReason =
      'No eligible jobs survived filtering; previous source jobs were preserved without recording lifecycle misses.'
  }

  if (
    options.replaceExisting !== false
    && (currentFingerprints.length > 0 || authoritativeEmpty)
  ) {
    const unseenFilter = options.replaceAllJobs
      ? { status: 'active' }
      : { source, status: 'active' }

    if (currentFingerprints.length > 0) {
      unseenFilter.fingerprint = { $nin: currentFingerprints }
    }

    const expireResult = await JobModel.updateMany(
      {
        ...unseenFilter,
        missedScrapeCount: { $gte: missesBeforeExpiry - 1 },
      },
      {
        $inc: { missedScrapeCount: 1 },
        $set: { status: 'expired' },
      },
    ).exec()

    const missResult = await JobModel.updateMany(
      unseenFilter,
      { $inc: { missedScrapeCount: 1 } },
    ).exec()

    result.expired = expireResult.modifiedCount ?? 0
    result.missed = result.expired + (missResult.modifiedCount ?? 0)
    shouldRefreshDatasetSummary = shouldRefreshDatasetSummary || result.expired > 0
  }

  if (shouldRefreshDatasetSummary && options.refreshDatasetSummary !== false && hasLiveDatabaseHandle()) {
    await refreshJobDatasetSummary()
  }

  return result
}

export const deleteAllJobsFromDB = async () => {
  await ensureConnected()
  const JobModel = await getJobModel()
  const result = await JobModel.deleteMany({})
  return result.deletedCount ?? 0
}

/**
 * Saves an array of scraped jobs to a local JSON file (dry-run mode).
 *
 * @param {object[]} jobs      Array of job objects
 * @param {string}   filePath  Absolute path to the output JSON file
 */
export const saveToFile = (jobs, filePath) => {
  const indiaJobs = filterIndiaJobs(jobs).map((job) => {
    const normalizedJob = normalizeScrapedJob(job, {
      source: job?.source || null,
    })
    const rawApplyUrl = String(job?.applyUrl || job?.link || '').trim()

    if (!normalizedJob.applyUrl && /^mailto:/i.test(rawApplyUrl)) {
      return {
        ...normalizedJob,
        applyUrl: rawApplyUrl,
        link: rawApplyUrl,
      }
    }

    return normalizedJob
  })
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(indiaJobs, null, 2), 'utf-8')
}
