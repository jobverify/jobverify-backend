import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const BOARD_URL = 'https://apply.workable.com/sigtuple/'
export const JOBS_FEED_URL = 'https://apply.workable.com/sigtuple/jobs.md'

const COMPANY_NAME = 'Sigtuple'
const SOURCE = 'sigtuple'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  label: 'sigtuple workable feed',
})

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\r/g, '')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeLocationPart = (value) => {
  const normalized = normalizeWhitespace(value)
  return normalized || null
}

const titleCase = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/\b([a-z])/g, (_, letter) => letter.toUpperCase())

const parseLocation = (value) => {
  const parts = String(value ?? '')
    .split(',')
    .map((part) => normalizeLocationPart(part))
    .filter(Boolean)

  const country = parts.at(-1) || null
  const city = parts[0] || null
  const state = parts.length >= 3 ? parts[1] : null

  return {
    location: parts.join(', ') || null,
    city,
    state,
    country,
  }
}

const isIndiaLocation = (value) => /(^|[\s,(])india($|[\s,).])/i.test(String(value ?? ''))

const extractJobId = (url) => {
  try {
    const pathnameParts = new URL(url).pathname.split('/').filter(Boolean)
    const jobToken = pathnameParts.at(-1) || null
    return jobToken ? jobToken.toUpperCase() : null
  } catch {
    return null
  }
}

export const extractJobsFromMarkdown = (markdown) => {
  const normalized = String(markdown ?? '')
  if (!normalized.trim() || /\b0 current openings\b/i.test(normalized)) return []

  return normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => {
      const match = /^-\s+\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s*-\s*(.+)$/i.exec(line)
      if (!match) return null

      const [, rawTitle, rawUrl, rawLocation] = match
      const locationBits = parseLocation(rawLocation)
      const jobId = extractJobId(rawUrl)

      if (!rawTitle || !rawUrl || !jobId || !isIndiaLocation(locationBits.location)) return null

      return {
        title: normalizeWhitespace(rawTitle),
        company: COMPANY_NAME,
        ...locationBits,
        jobId,
        requisitionId: jobId,
        sourceUrl: rawUrl,
        applyUrl: rawUrl,
        department: null,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
      }
    })
    .filter(Boolean)
    .map((job) => ({
      ...job,
      city: job.city ? titleCase(job.city) : null,
      state: job.state ? titleCase(job.state) : null,
      country: job.country ? titleCase(job.country) : null,
      location: job.location
        ? job.location
          .split(',')
          .map((part) => titleCase(part.trim()))
          .join(', ')
        : null,
    }))
}

const normalizeScrapedAt = (value) => {
  if (value instanceof Date) return value.toISOString()

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid now() value supplied to Sigtuple scraper')
  }

  return parsed.toISOString()
}

export const createSigtupleScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date(),
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const limit = Number.isInteger(options.maxJobs) ? options.maxJobs : maxJobs
    const jobs = extractJobsFromMarkdown(await fetchText(JOBS_FEED_URL))
    const selected = limit ? jobs.slice(0, limit) : jobs
    const scrapedAt = normalizeScrapedAt((options.now || now)())

    return selected.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createSigtupleScraper().run(options)
