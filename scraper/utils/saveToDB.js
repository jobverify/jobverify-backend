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
import { normalizeScrapedJob, resolveJobType } from './normalizeScrapedJob.js'
import { enqueueJobAlertsForJobs } from '../../src/services/jobAlertService.js'

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

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const jobRetentionDays = () =>
  parsePositiveInteger(process.env.SCRAPER_JOB_POSTED_WITHIN_DAYS, 10)

const startOfDay = (date) => {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

const daysAgoCutoff = (date, days) => {
  const cutoff = startOfDay(date)
  cutoff.setDate(cutoff.getDate() - days)
  return cutoff
}

const normalizeDate = (value) => {
  if (value == null) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
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
 * - Deletes stale jobs for that source only after the replacement write succeeds.
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

  const now = new Date()
  const retentionDays = parsePositiveInteger(
    options.retentionDays ?? process.env.SCRAPER_JOB_POSTED_WITHIN_DAYS,
    jobRetentionDays(),
  )
  const postedAtCutoff = daysAgoCutoff(now, retentionDays)
  const filterCounts = {
    nonIndia: 0,
    old: 0,
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
    const postedAt = normalizeDate(job.postedAt)
    if (postedAt && startOfDay(postedAt) < postedAtCutoff) {
      filterCounts.old++
      return false
    }
    return true
  })

  const operations = eligibleJobs.map((job) => {
    const normalizedJob = normalizeScrapedJob(job, { source })
    const fingerprint = generateFingerprint(normalizedJob)
    const sourceUrl = normalizeHttpUrl(normalizedJob.sourceUrl)
    const applyUrl = normalizeHttpUrl(normalizedJob.applyUrl) || sourceUrl
    const postedAt = normalizeDate(normalizedJob.postingDate)
    const closingDate = normalizeDate(normalizedJob.closingDate)
    const locations = normalizeStoredLocations(normalizedJob)
    const locationLabel = formatStoredLocationLabel(normalizedJob)
    const finalCity = getValidIndiaCityForJob(normalizedJob)
    const searchKeys = buildJobSearchKeys({
      ...normalizedJob,
      location: locationLabel || normalizedJob.location || null,
      locations,
      city: finalCity,
    })

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
    filteredSenior: filterCounts.senior,
    filteredInvalidUrl: filterCounts.invalidUrl,
    missed: 0,
    expired: 0,
    eligibleJobs: eligibleJobs.length,
    retentionDays,
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

      enqueueJobAlertsForJobs(insertedJobs)
    }
  }

  if (options.replaceExisting !== false && currentFingerprints.length === 0) {
    result.staleCheckSkipped = true
    result.staleCheckReason = 'No eligible jobs survived filtering; preserved previous source jobs.'
    return result
  }

  if (options.replaceExisting !== false) {
    const deleteFilter = options.replaceAllJobs
      ? { fingerprint: { $nin: currentFingerprints } }
      : { source, fingerprint: { $nin: currentFingerprints } }
    const deleteResult = await JobModel.deleteMany(deleteFilter)
    result.deleted = deleteResult.deletedCount ?? 0
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
  const indiaJobs = filterIndiaJobs(jobs)
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(indiaJobs, null, 2), 'utf-8')
}
