import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const OFFICIAL_CAREERS_URL = 'https://bharatx.tech/careers/'
export const BOARD_URL = 'https://apply.workable.com/bharatx/?lng=en'
export const JOBS_FEED_URL = 'https://apply.workable.com/bharatx/jobs.md'

const COMPANY_NAME = 'BharatX'
const SOURCE = 'bharatx'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  label: 'bharatx workable feed',
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

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /<title[^>]*>\s*(?:BharatX Careers|Careers\s*-\s*BharatX)\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/bharatx\.tech\/careers\/["']/i.test(page)
    && /Check open roles/i.test(page)
    && page.includes(BOARD_URL)
}

const parseMarkdownJobLine = (line) => {
  const bulletMatch = /^-\s+\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)\s*-\s*(.+)$/i.exec(line)
  if (bulletMatch) {
    const [, rawTitle, rawUrl, rawLocation] = bulletMatch
    return {
      rawTitle,
      rawUrl,
      rawLocation,
      department: null,
      employmentType: null,
      postingDate: null,
    }
  }

  if (!line.startsWith('|') || /^[-\s|]+$/.test(line)) return null

  const columns = line
    .split('|')
    .slice(1, -1)
    .map((column) => column.trim())
  const [titleColumn, department, rawLocation, employmentType, , postingDate, detailsColumn] = columns
  const titleMatch = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/i.exec(titleColumn || '')
  const detailsMatch = /\]\((https?:\/\/[^\s)]+)\)/i.exec(detailsColumn || '')

  if (!titleMatch) return null

  return {
    rawTitle: titleMatch[1],
    rawUrl: detailsMatch?.[1] || titleMatch[2],
    rawLocation,
    department: normalizeWhitespace(department),
    employmentType: normalizeWhitespace(employmentType),
    postingDate: normalizeWhitespace(postingDate),
  }
}

export const extractJobsFromMarkdown = (markdown) => {
  const normalized = String(markdown ?? '')
  if (!normalized.trim()) return []

  return normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => {
      const parsedLine = parseMarkdownJobLine(line)
      if (!parsedLine) return null

      const { rawTitle, rawUrl, rawLocation } = parsedLine
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
        department: parsedLine.department,
        employmentType: parsedLine.employmentType,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: parsedLine.postingDate,
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
    throw new Error('Invalid now() value supplied to BharatX scraper')
  }

  return parsed.toISOString()
}

export const createBharatXScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date(),
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('BharatX verified official careers page no longer matches the verified public surface')
    }

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

export const run = async (options = {}) => createBharatXScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
