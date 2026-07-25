import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { EMBITEL_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = EMBITEL_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const PUBLIC_BOARD_URL = PROVIDER_METADATA.publicBoardUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const NEXT_DATA_MARKER = '<script id="__NEXT_DATA__" type="application/json">'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const stripHtml = (value) => normalizeWhitespace(
  decodeHtmlEntities(value)
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractNextDataPayload = (html) => {
  const start = String(html).indexOf(NEXT_DATA_MARKER)
  if (start < 0) {
    throw new Error('Unable to locate Embitel Technologies __NEXT_DATA__ payload')
  }

  const jsonStart = start + NEXT_DATA_MARKER.length
  const jsonEnd = String(html).indexOf('</script>', jsonStart)
  if (jsonEnd < 0) {
    throw new Error('Unable to locate Embitel Technologies __NEXT_DATA__ closing tag')
  }

  return JSON.parse(String(html).slice(jsonStart, jsonEnd))
}

const toIsoDate = (value) => {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp)) return null

  const parsed = new Date(timestamp)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toUpperCase()
  if (!normalized) return null
  if (normalized === 'FULLTIME' || normalized === 'FULL_TIME') return 'Full-time'
  return normalizeWhitespace(value)
}

const extractSkills = (description) => {
  const normalized = stripHtml(description)
  if (!normalized) return []

  const match = normalized.match(
    /\b(?:Key\s+)?Skills?\s*:?\s*(.+?)(?:\bResponsibilities?\b|\bRequired\b|\bPreferred\b|$)/i,
  )
  if (!match) return []

  return [...new Set(
    match[1]
      .split(',')
      .map((skill) => normalizeWhitespace(skill))
      .filter(Boolean),
  )]
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const buildListingUrl = ({ page = 1 } = {}) =>
  page > 1 ? `${PUBLIC_BOARD_URL}?page=${page}` : PUBLIC_BOARD_URL

export const buildJobUrl = (jobId) => `${PUBLIC_BOARD_URL}/jobs/${normalizeWhitespace(jobId)}`

export const extractBoardSummary = (html) => {
  const payload = extractNextDataPayload(html)
  const rows = Array.isArray(payload?.props?.pageProps?.jobsData?.rows)
    ? payload.props.pageProps.jobsData.rows
    : []
  const totalCount = Number(payload?.props?.pageProps?.jobsData?.count) || 0
  const currentPage = Number.parseInt(payload?.query?.page || '1', 10) || 1
  const pageSize = rows.length || 1
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return {
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    hasNext: currentPage < totalPages,
  }
}

export const extractSearchResults = (html) => {
  const payload = extractNextDataPayload(html)
  const rows = Array.isArray(payload?.props?.pageProps?.jobsData?.rows)
    ? payload.props.pageProps.jobsData.rows
    : []

  return rows
    .filter((record) => normalizeWhitespace(record.job_status)?.toUpperCase() === 'OPEN')
    .map((record) => {
      const jobId = normalizeWhitespace(record.id)
      const city = normalizeWhitespace(record.location)
      const sourceUrl = buildJobUrl(jobId)

      return {
        title: normalizeWhitespace(record.title),
        company: COMPANY,
        department: normalizeWhitespace(record.department),
        location: city ? `${city}, India` : null,
        city,
        jobId,
        requisitionId: normalizeWhitespace(record.code) || jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeEmploymentType(record.job_type),
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: extractSkills(record.description_external),
        postingDate: toIsoDate(record.created_on),
        closingDate: null,
        jobDescription: stripHtml(record.description_external),
      }
    })
}

export const createEmbitelTechnologiesScraper = ({
  maxPages = Number.POSITIVE_INFINITY,
  maxJobs = null,
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const jobs = []

    for (let page = 1; page <= maxPages; page += 1) {
      const html = await fetchText(buildListingUrl({ page }))
      const pageJobs = extractSearchResults(html)
      const summary = extractBoardSummary(html)

      for (const job of pageJobs) {
        jobs.push({
          ...job,
          source: SOURCE,
          link: job.applyUrl,
          scrapedAt: new Date().toISOString(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      if (!summary.hasNext) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createEmbitelTechnologiesScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
