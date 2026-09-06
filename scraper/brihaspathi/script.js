import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'brihaspathi'
export const COMPANY = 'Brihaspathi Technologies Limited'
export const CAREERS_URL = 'https://www.brihaspathi.com/careers'
export const JOBS_API_URL =
  'https://www.brihaspathi.com/strapi/api/job-openings?sort=createdAt:desc&pagination[pageSize]=100&filters[isActive][$eq]=true'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return /india/i.test(normalized) ? normalized : `${normalized}, India`
}

const isPlaceholderRecord = (attributes) => {
  const title = normalizeWhitespace(
    attributes?.title
    || attributes?.jobTitle
    || attributes?.position
    || attributes?.role,
  )
  const location = normalizeWhitespace(
    attributes?.location
    || attributes?.officeLocation
    || attributes?.jobLocation
    || attributes?.city,
  )

  // The current public API has a single keyboard-smash test record. Do not publish it as a vacancy.
  return Boolean(title && location && !/[aeiou]/i.test(title) && !/[aeiou]/i.test(location))
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''

  const hasLegacyVacanciesShell = normalized.includes('Open Vacancies')
    && normalized.includes('Careers')
  const hasCurrentCareersShell = normalized.includes('Careers at Brihaspathi Technologies, Hyderabad')
    && normalized.includes('Build what the country runs on.')

  return /<title[^>]*>\s*(?:Brihaspathi Careers|Brihaspathi technologies limited)\s*<\/title>/i.test(page)
    && (hasLegacyVacanciesShell || hasCurrentCareersShell)
}

export const hasZeroVacanciesSignal = (html = '') => {
  const normalized = normalizeWhitespace(html) || ''
  return /\bVacancies\s+0\b/i.test(normalized)
}

export const extractJobsFromPayload = (payload, { scrapedAt } = {}) => {
  const rows = Array.isArray(payload?.data) ? payload.data : null
  if (!rows) return null
  if (rows.length === 0) return []

  if (rows.every((row) => isPlaceholderRecord(row?.attributes ?? row))) {
    return []
  }

  const jobs = rows
    .map((row) => {
      const attributes =
        row?.attributes && typeof row.attributes === 'object'
          ? row.attributes
          : row
      const title = normalizeWhitespace(
        attributes?.title
        || attributes?.jobTitle
        || attributes?.position
        || attributes?.role,
      )
      const location = normalizeLocation(
        attributes?.location
        || attributes?.officeLocation
        || attributes?.jobLocation
        || attributes?.city,
      )
      const jobId = normalizeWhitespace(row?.id || attributes?.id || title)

      if (!title || !location || !jobId) return null

      const applyUrl = normalizeWhitespace(
        attributes?.applyUrl
        || attributes?.applicationUrl
        || attributes?.jobUrl
        || attributes?.url,
      ) || CAREERS_URL

      return {
        title,
        company: COMPANY,
        department: normalizeWhitespace(attributes?.department),
        location,
        city: normalizeCity(location.split(',')[0]),
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: applyUrl,
        applyUrl,
        employmentType: normalizeWhitespace(attributes?.employmentType),
        experienceRequired: normalizeWhitespace(attributes?.experience),
        minimumQualification: normalizeWhitespace(attributes?.minimumQualification),
        preferredQualification: normalizeWhitespace(attributes?.preferredQualification),
        requiredSkills: [],
        postingDate: normalizeWhitespace(attributes?.publishedAt || attributes?.createdAt),
        closingDate: normalizeWhitespace(attributes?.closingDate),
        jobDescription: normalizeWhitespace(attributes?.description),
        remoteStatus: /remote/i.test(location) ? 'Remote' : 'On-site',
        source: SOURCE,
        link: applyUrl,
        scrapedAt,
      }
    })
    .filter(Boolean)

  if (rows.length > 0 && jobs.length === 0) {
    throw new Error('Brihaspathi public job-openings payload changed and could not be normalized')
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'brihaspathi-official',
  timeoutMs: 15000,
})

const defaultFetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const createBrihaspathiScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now: overrideNow,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Expected verified official Brihaspathi careers surface with the current Open Vacancies shell')
    }

    if (hasZeroVacanciesSignal(careersHtml)) {
      return []
    }

    const payload = await fetchJson(JOBS_API_URL, { method: 'GET' })
    const jobs = extractJobsFromPayload(payload, { scrapedAt: (overrideNow || now)() })

    if (jobs === null) {
      throw new Error('Expected verified Brihaspathi public job-openings API to return an array payload')
    }

    return jobs
  },
})

export const run = async (options = {}) => createBrihaspathiScraper().run(options)

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
