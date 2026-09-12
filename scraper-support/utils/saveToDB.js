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
  normalizeLifecycleDate,
  resolveJobMissesBeforeExpiry,
  resolveJobPostedAt,
} from '../../src/utils/jobLifecycle.js'
import { normalizeScrapedJob, resolveJobType } from './normalizeScrapedJob.js'
import { enrichJobsWithPublicExperience } from './publicExperienceEnrichment.js'
import { jobAlertService } from '../../src/services/jobAlertService.js'
import { refreshJobDatasetSummary } from '../../src/services/jobDatasetSummaryService.js'
import {
  analyzePublishableJobs,
  normalizeHttpUrl,
} from './publishableJobMetrics.js'

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env'), quiet: true })

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

export const DEFAULT_EXPIRED_JOB_PURGE_RETENTION_DAYS = 30
export const DEFAULT_QUOTA_RECOVERY_TARGET_BYTES = 10 * 1024 * 1024

const resolvePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export const estimateJobDocumentBytes = (job) => Buffer.byteLength(
  JSON.stringify(job),
  'utf8',
)

/**
 * Physically deletes the oldest expired jobs, bounded by an estimated document
 * size. This is deliberately limited to expired records so quota recovery can
 * never remove listings that are still publicly visible.
 */
export const purgeExpiredJobsForQuotaRecovery = async ({
  jobModel = null,
  now = new Date(),
  retentionDays = DEFAULT_EXPIRED_JOB_PURGE_RETENTION_DAYS,
  targetBytes = DEFAULT_QUOTA_RECOVERY_TARGET_BYTES,
  batchSize = 100,
  dryRun = false,
} = {}) => {
  const JobModel = jobModel || await getJobModel()
  if (!jobModel) await ensureConnected()

  const normalizedNow = normalizeLifecycleDate(now) || new Date()
  const normalizedRetentionDays = resolvePositiveInteger(
    retentionDays,
    DEFAULT_EXPIRED_JOB_PURGE_RETENTION_DAYS,
  )
  const normalizedTargetBytes = resolvePositiveInteger(
    targetBytes,
    DEFAULT_QUOTA_RECOVERY_TARGET_BYTES,
  )
  const normalizedBatchSize = resolvePositiveInteger(batchSize, 100)
  const cutoff = new Date(normalizedNow)
  cutoff.setUTCDate(cutoff.getUTCDate() - normalizedRetentionDays)

  let deletedCount = 0
  let estimatedBytes = 0

  while (estimatedBytes < normalizedTargetBytes) {
    const candidates = await JobModel.find({
      status: 'expired',
      lastSeenAt: { $lt: cutoff },
    })
      .sort({ lastSeenAt: 1, _id: 1 })
      .limit(normalizedBatchSize)
      .lean()
      .exec()

    if (!candidates.length) break

    const selected = []
    for (const candidate of candidates) {
      selected.push(candidate)
      estimatedBytes += estimateJobDocumentBytes(candidate)
      if (estimatedBytes >= normalizedTargetBytes) break
    }

    if (!dryRun) {
      const deletion = JobModel.deleteMany({
        _id: { $in: selected.map((job) => job._id) },
        status: 'expired',
      })
      const deleteResult = typeof deletion?.exec === 'function'
        ? await deletion.exec()
        : await deletion
      deletedCount += deleteResult.deletedCount ?? 0
    } else {
      deletedCount += selected.length
    }

    // A preview must not fetch the same rows repeatedly because it does not
    // mutate them. The live quota-recovery path always runs with dryRun=false.
    if (dryRun) break
    if (selected.length < candidates.length || estimatedBytes >= normalizedTargetBytes) break
  }

  return {
    dryRun,
    deletedCount,
    estimatedBytes,
    targetBytes: normalizedTargetBytes,
    retentionDays: normalizedRetentionDays,
    cutoff,
  }
}

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
 * - Keeps open scraped jobs regardless of their posting date.
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

const emitStage = (source, onStage, event = {}) => {
  if (typeof onStage !== 'function') return

  onStage({
    source,
    ...event,
  })
}

const getAbortReason = (signal, fallbackMessage) => (
  signal?.reason || new Error(fallbackMessage)
)

const throwIfAborted = (signal, fallbackMessage = 'Scraper persistence aborted') => {
  if (signal?.aborted) {
    throw getAbortReason(signal, fallbackMessage)
  }
}

const runStage = async (source, onStage, stage, operation, details = {}, { signal = null } = {}) => {
  throwIfAborted(signal)
  const startedAt = Date.now()
  emitStage(source, onStage, {
    stage,
    status: 'start',
    ...details,
  })

  try {
    throwIfAborted(signal)
    const result = await operation()
    throwIfAborted(signal)
    emitStage(source, onStage, {
      stage,
      status: 'done',
      durationMs: Date.now() - startedAt,
      ...details,
    })
    return result
  } catch (error) {
    emitStage(source, onStage, {
      stage,
      status: 'error',
      durationMs: Date.now() - startedAt,
      error: error?.message || String(error),
      ...details,
    })
    throw error
  }
}

export const saveToDB = async (jobs, source, options = {}) => {
  await ensureConnected()
  const JobModel = await getJobModel()
  const onStage = options.onStage
  const signal = options.signal || null
  throwIfAborted(signal)

  const now = normalizeLifecycleDate(options.now) || new Date()
  const missesBeforeExpiry = resolveJobMissesBeforeExpiry(
    options.missesBeforeExpiry ?? process.env.SCRAPER_JOB_MISSES_BEFORE_EXPIRY,
  )
  const {
    eligibleJobs,
    filterCounts,
  } = analyzePublishableJobs(jobs, {
    now,
  })

  const jobsForPersistence = options.enrichPublicExperience === false
    ? (() => {
        emitStage(source, onStage, {
          stage: 'enrichment',
          status: 'skipped',
          jobs: eligibleJobs.length,
        })
        return eligibleJobs
      })()
    : await runStage(
        source,
        onStage,
        'enrichment',
        () => enrichJobsWithPublicExperience(eligibleJobs, {
          fetchText: options.fetchText,
          fetchBrowserText: options.fetchBrowserText,
          concurrency: options.experienceEnrichmentConcurrency,
          useBrowserFallback: options.useBrowserFallback,
          signal,
          fetchTimeoutMs: options.fetchTimeoutMs,
          pdfTextExtractionTimeoutMs: options.pdfTextExtractionTimeoutMs,
        }),
        { jobs: eligibleJobs.length },
        { signal },
      )
  throwIfAborted(signal)

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
            publicExperienceChecked: normalizedJob.publicExperienceChecked === true,
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
    filteredInvalidUrl: filterCounts.invalidUrl,
    missed: 0,
    expired: 0,
    eligibleJobs: eligibleJobs.length,
    missesBeforeExpiry,
    staleCheckSkipped: false,
    staleCheckReason: null,
  }

  const currentFingerprints = operations.map((operation) => operation.updateOne.filter.fingerprint)

  if (operations.length > 0) {
    const bulkResult = await runStage(
      source,
      onStage,
      'bulkWrite',
      () => JobModel.bulkWrite(operations, { ordered: false }),
      { operations: operations.length },
      { signal },
    )
    throwIfAborted(signal)
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
  const incompleteListing = jobs.some((job) => job?.sourceListingComplete === false)
  const authoritativeEmpty = currentFingerprints.length === 0
    && options.authoritativeEmpty === true

  if (
    options.replaceExisting !== false
    && incompleteListing
  ) {
    result.staleCheckSkipped = true
    result.staleCheckReason = 'Incomplete source listing; previous vacancies were preserved without recording lifecycle misses.'
  }

  if (
    options.replaceExisting !== false
    && !incompleteListing
    && currentFingerprints.length === 0
    && !authoritativeEmpty
  ) {
    result.staleCheckSkipped = true
    result.staleCheckReason =
      'No eligible jobs survived filtering; previous source jobs were preserved without recording lifecycle misses.'
  }

  if (
    options.replaceExisting !== false
    && !incompleteListing
    && (currentFingerprints.length > 0 || authoritativeEmpty)
  ) {
    const unseenFilter = options.replaceAllJobs
      ? { status: 'active' }
      : { source, status: 'active' }

    if (currentFingerprints.length > 0) {
      unseenFilter.fingerprint = { $nin: currentFingerprints }
    }

    const expireResult = await runStage(
      source,
      onStage,
      'expireUnseen',
      () => JobModel.updateMany(
        {
          ...unseenFilter,
          missedScrapeCount: { $gte: missesBeforeExpiry - 1 },
        },
        {
          $inc: { missedScrapeCount: 1 },
          $set: { status: 'expired' },
        },
      ).exec(),
      {},
      { signal },
    )

    const missResult = await runStage(
      source,
      onStage,
      'recordMisses',
      () => JobModel.updateMany(
        unseenFilter,
        { $inc: { missedScrapeCount: 1 } },
      ).exec(),
      {},
      { signal },
    )

    result.expired = expireResult.modifiedCount ?? 0
    result.missed = result.expired + (missResult.modifiedCount ?? 0)
    shouldRefreshDatasetSummary = shouldRefreshDatasetSummary || result.expired > 0
  }

  if (shouldRefreshDatasetSummary && options.refreshDatasetSummary !== false && hasLiveDatabaseHandle()) {
    await runStage(
      source,
      onStage,
      'datasetSummary',
      () => refreshJobDatasetSummary(),
      {},
      { signal },
    )
  }

  return result
}

export const deleteAllJobsFromDB = async () => {
  await ensureConnected()
  const JobModel = await getJobModel()
  const result = await JobModel.deleteMany({})
  return result.deletedCount ?? 0
}

const normalizeDryRunJobs = (jobs) => filterIndiaJobs(jobs).map((job) => {
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

const VOLATILE_DRY_RUN_SNAPSHOT_FIELDS = new Set([
  'postedAt',
  'postingDate',
  'scrapedAt',
  'scrapedTimestamp',
  'extractedAt',
])

const stripVolatileDryRunSnapshotFields = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => stripVolatileDryRunSnapshotFields(entry))
  }

  if (!value || typeof value !== 'object') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !VOLATILE_DRY_RUN_SNAPSHOT_FIELDS.has(key))
      .map(([key, entryValue]) => [key, stripVolatileDryRunSnapshotFields(entryValue)]),
  )
}

const writeDryRunSnapshotIfChanged = async (filePath, content, options = {}) => {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true })

  let hasExistingSnapshot = false

  try {
    const existingContent = await fs.promises.readFile(filePath, 'utf8')
    hasExistingSnapshot = true
    if (existingContent === content) {
      return false
    }

    const existingSnapshot = stripVolatileDryRunSnapshotFields(JSON.parse(existingContent))
    const nextSnapshot = stripVolatileDryRunSnapshotFields(JSON.parse(content))
    if (JSON.stringify(existingSnapshot) === JSON.stringify(nextSnapshot)) {
      return false
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      // No snapshot exists yet, so we need to write one.
    } else if (error instanceof SyntaxError) {
      // Corrupt or partial snapshots should be replaced with a fresh write.
    } else {
      throw error
    }
  }

  const tempFilePath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.${crypto.randomUUID()}.tmp`,
  )

  try {
    await fs.promises.writeFile(tempFilePath, content, 'utf-8')
    await fs.promises.rename(tempFilePath, filePath)
  } catch (error) {
    await fs.promises.rm(tempFilePath, { force: true }).catch(() => {})

    // Backfill runs can hit workspace quota limits where an atomic sidecar file
    // cannot fit even though overwriting the existing snapshot in place can.
    if (
      error?.code === 'ENOSPC'
      && options.allowInPlaceRewriteOnEnospc === true
      && hasExistingSnapshot
    ) {
      await fs.promises.writeFile(filePath, content, 'utf-8')
    } else {
      throw error
    }
  }

  return true
}

export const saveDryRunSnapshot = async (jobs, filePath, options = {}) => {
  const filteredJobs = filterIndiaJobs(jobs)
  const hasTargetedSelection = typeof options.shouldEnrichJob === 'function'
    || (Number.isInteger(options.maxJobsToEnrich) && options.maxJobsToEnrich > 0)
  const maxJobsToEnrich = Number.isInteger(options.maxJobsToEnrich) && options.maxJobsToEnrich > 0
    ? options.maxJobsToEnrich
    : Number.POSITIVE_INFINITY
  const shouldEnrichJob = typeof options.shouldEnrichJob === 'function'
    ? options.shouldEnrichJob
    : () => true

  let enrichedJobs = filteredJobs

  if (options.enrichPublicExperience !== false) {
    if (!hasTargetedSelection) {
      enrichedJobs = await enrichJobsWithPublicExperience(filteredJobs, {
        fetchText: options.fetchText,
        fetchBrowserText: options.fetchBrowserText,
        concurrency: options.experienceEnrichmentConcurrency,
        useBrowserFallback: options.useBrowserFallback,
      })
    } else {
      const selectedIndices = []
      const selectedJobs = []

      for (let index = 0; index < filteredJobs.length; index += 1) {
        if (selectedJobs.length >= maxJobsToEnrich) break
        if (!shouldEnrichJob(filteredJobs[index], index)) continue

        selectedIndices.push(index)
        selectedJobs.push(filteredJobs[index])
      }

      if (selectedJobs.length > 0) {
        const enrichedSelectedJobs = await enrichJobsWithPublicExperience(selectedJobs, {
          fetchText: options.fetchText,
          fetchBrowserText: options.fetchBrowserText,
          concurrency: options.experienceEnrichmentConcurrency,
          useBrowserFallback: options.useBrowserFallback,
        })

        enrichedJobs = [...filteredJobs]
        for (let index = 0; index < selectedIndices.length; index += 1) {
          enrichedJobs[selectedIndices[index]] = enrichedSelectedJobs[index]
        }
      }
    }
  }

  const normalizedJobs = normalizeDryRunJobs(enrichedJobs)
  await writeDryRunSnapshotIfChanged(filePath, JSON.stringify(normalizedJobs, null, 2), {
    allowInPlaceRewriteOnEnospc: options.allowInPlaceRewriteOnEnospc === true,
  })
  return normalizedJobs
}

/**
 * Saves an array of scraped jobs to a local JSON file (dry-run mode).
 *
 * @param {object[]} jobs      Array of job objects
 * @param {string}   filePath  Absolute path to the output JSON file
 */
export const saveToFile = (jobs, filePath) => {
  const indiaJobs = normalizeDryRunJobs(jobs)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(indiaJobs, null, 2), 'utf-8')
}
