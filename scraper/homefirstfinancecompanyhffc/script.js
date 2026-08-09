import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOMEPAGE_URL = 'https://homefirstindia.com/'
export const CAREERS_URL = 'https://homefirstindia.com/careers'
export const JOB_LISTING_URL = 'https://homefirstindia.com/careers/job-listing'

const COMPANY = 'Home First Finance Company (HFFC)'
const SOURCE = 'homefirstfinancecompanyhffc'
const JOB_LIST_MARKER = /"JobList"\s*:\s*\[/
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const toDateOnly = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return null

  return [
    parsed.getUTCFullYear(),
    String(parsed.getUTCMonth() + 1).padStart(2, '0'),
    String(parsed.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

const joinTextParts = (...values) => normalizeWhitespace(values.filter(Boolean).join(' '))

const getRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized.includes('office')) return 'On-site'
  if (normalized.includes('remote')) return 'Remote'
  if (normalized.includes('hybrid')) return 'Hybrid'
  return null
}

const parseJsonArrayAt = (value, startIndex) => {
  if (startIndex < 0 || value[startIndex] !== '[') return null

  let depth = 0
  let inString = false
  let escaping = false

  for (let index = startIndex; index < value.length; index += 1) {
    const character = value[index]

    if (inString) {
      if (escaping) {
        escaping = false
      } else if (character === '\\') {
        escaping = true
      } else if (character === '"') {
        inString = false
      }

      continue
    }

    if (character === '"') {
      inString = true
      continue
    }

    if (character === '[') {
      depth += 1
      continue
    }

    if (character === ']') {
      depth -= 1
      if (depth === 0) {
        return JSON.parse(value.slice(startIndex, index + 1))
      }
    }
  }

  return null
}

export const hasOfficialJobListingSignal = (html) => {
  const page = String(html ?? '')

  return /home\s+first/i.test(page)
    && /job\s+listing/i.test(page)
    && /careers@homefirstindia\.com/i.test(page)
    && /current\s+openings/i.test(page)
}

export const buildSearchUrl = () => JOB_LISTING_URL

export const extractEmbeddedJobList = (html) => {
  const page = String(html ?? '')
  const markerMatch = page.match(JOB_LIST_MARKER)
  if (!markerMatch || markerMatch.index == null) return null

  const arrayStartIndex = page.indexOf('[', markerMatch.index)
  if (arrayStartIndex < 0) return null

  return parseJsonArrayAt(page, arrayStartIndex)
}

export const extractSearchResults = (html) => {
  const records = extractEmbeddedJobList(html)
  if (!Array.isArray(records)) return []

  return records
    .map((record) => {
      if (record?.active !== true) return null

      const title = normalizeWhitespace(record?.job?.position)
      const city = normalizeWhitespace(record?.city?.name)
      const state = normalizeWhitespace(record?.state?.name || record?.city?.state?.name)
      const jobId = normalizeWhitespace(record?.id)
      const requisitionId = normalizeWhitespace(record?.job?.id)
      const minimumQualification = normalizeWhitespace(record?.job?.qualification)
      const preferredQualification = normalizeWhitespace(record?.job?.expectations)
      const responsibility = normalizeWhitespace(record?.job?.responsibility)
      const description = normalizeWhitespace(record?.job?.description)
      const department = normalizeWhitespace(record?.job?.department)
      const employmentType = normalizeWhitespace(record?.job?.jobType)

      if (!title || !city || !jobId || !requisitionId) return null

      return {
        title,
        company: COMPANY,
        department,
        location: state ? `${city}, ${state}, India` : `${city}, India`,
        city,
        country: 'India',
        jobId,
        requisitionId,
        sourceUrl: JOB_LISTING_URL,
        applyUrl: JOB_LISTING_URL,
        employmentType,
        experienceRequired: minimumQualification,
        minimumQualification,
        preferredQualification,
        requiredSkills: [],
        postingDate: toDateOnly(record?.startDatetime),
        closingDate: toDateOnly(record?.endDatetime),
        jobDescription: joinTextParts(description, responsibility, preferredQualification),
        remoteStatus: getRemoteStatus(record?.job?.workModel),
      }
    })
    .filter(Boolean)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createHomeFirstFinanceCompanyHffcScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(buildSearchUrl())

    if (!hasOfficialJobListingSignal(html)) {
      throw new Error(
        'Home First Finance Company (HFFC) verified official public jobs surface changed materially',
      )
    }

    const jobs = extractSearchResults(html)
    if (extractEmbeddedJobList(html) == null) {
      throw new Error(
        'Home First Finance Company (HFFC) verified official public jobs surface changed materially',
      )
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createHomeFirstFinanceCompanyHffcScraper(options).run(options)

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
