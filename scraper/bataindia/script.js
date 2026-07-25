import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BATA_INDIA_CATALOG } from './catalog.js'
import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = BATA_INDIA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_BOARD_URL = PROVIDER_METADATA.companyCareerPage

const NEXT_DATA_MARKER = '<script id="__NEXT_DATA__" type="application/json">'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const ensureTrailingSlash = (value) => (
  String(value ?? '').endsWith('/') ? String(value ?? '') : `${String(value ?? '')}/`
)

const normalizeUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '')
    }
    url.hash = ''
    return url.toString()
  } catch {
    return normalizeWhitespace(value)
  }
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
    throw new Error('Unable to locate Bata India __NEXT_DATA__ payload')
  }

  const jsonStart = start + NEXT_DATA_MARKER.length
  const jsonEnd = String(html).indexOf('</script>', jsonStart)
  if (jsonEnd < 0) {
    throw new Error('Unable to locate Bata India __NEXT_DATA__ closing tag')
  }

  return JSON.parse(String(html).slice(jsonStart, jsonEnd))
}

const toIsoDate = (value) => {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp)) return null

  const parsed = new Date(timestamp)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10)
}

export const buildIframeListingUrl = ({ page = 1 } = {}) =>
  `${ensureTrailingSlash(CAREERS_BOARD_URL)}iframe/jobs?page=${page}&isIframe=true`

export const IFRAME_LISTINGS_URL = buildIframeListingUrl({ page: 1 })

export const buildJobUrl = (jobId) =>
  new URL(`jobs/${normalizeWhitespace(jobId)}`, ensureTrailingSlash(CAREERS_BOARD_URL)).toString()

export const hasOfficialCareersPageSignal = (html) => {
  const page = String(html ?? '')
  return /bata/i.test(page) && /<a\b[^>]*href=["']https:\/\/bata\.sensehq\.com\/careers\/?["'][^>]*>\s*Careers\s*<\/a>/i.test(page)
}

export const extractSenseHqCareersUrl = (html) => {
  const match = String(html ?? '').match(/href=["'](https:\/\/bata\.sensehq\.com\/careers\/?)["']/i)
  return match ? normalizeUrl(match[1]) : null
}

const isOfficialPageTimeoutError = (error) => {
  const seen = new Set()
  let current = error
  let sawFetchFailed = false
  let sawConnectTimeout = false

  while (current && !seen.has(current)) {
    seen.add(current)

    const message = String(current?.message ?? current)
    const causeCode = String(current?.code ?? '')
    if (/fetch failed/i.test(message)) sawFetchFailed = true
    if (/UND_ERR_CONNECT_TIMEOUT/i.test(causeCode)) sawConnectTimeout = true

    current = current?.cause
  }

  return sawFetchFailed && sawConnectTimeout
}

const isIndiaJob = (record = {}) => {
  const officeCountry = normalizeWhitespace(record.office?.country)
  if (officeCountry && officeCountry.toLowerCase() === 'india') return true

  const locationText = [
    normalizeWhitespace(record.location),
    normalizeWhitespace(record.office?.city),
    normalizeWhitespace(record.office?.name),
  ]
    .filter(Boolean)
    .join(' ')

  return /\bindia\b/i.test(locationText)
}

const buildLocation = (record = {}) => {
  const rawLocation = normalizeWhitespace(record.location || record.office?.city || record.office?.location)
  if (!rawLocation) return { location: null, city: null }

  const normalizedLocation = rawLocation
    .split(',')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)
    .join(', ')

  if (!normalizedLocation) return { location: null, city: null }

  return {
    location: /india/i.test(normalizedLocation)
      ? normalizedLocation
      : `${normalizedLocation}, India`,
    city: normalizeWhitespace(normalizedLocation.split(',')[0]) || null,
  }
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toUpperCase()
  if (!normalized) return null

  if (normalized === 'FULLTIME' || normalized === 'FULL_TIME') return 'Full-time'
  if (normalized === 'PARTTIME' || normalized === 'PART_TIME') return 'Part-time'
  if (normalized === 'CONTRACT') return 'Contract'
  if (normalized === 'INTERNSHIP' || normalized === 'INTERN') return 'Internship'
  return normalizeWhitespace(value)
}

const extractExperience = (record = {}, description) => {
  const start = Number(record.experience_start)
  const end = Number(record.experience_end)
  if (Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start) {
    return `${start}-${end} years`
  }

  const normalized = stripHtml(description)
  if (!normalized) return null

  const match = normalized.match(/\b([0-9]+\s*-\s*[0-9]+\s*years?)\b/i)
  return match ? normalizeWhitespace(match[1]) : null
}

const extractSkills = (description) => {
  const normalized = stripHtml(description)
  if (!normalized) return []

  const match = normalized.match(
    /\b(?:Key\s+)?Skills?\s*:?\s*(.+?)(?:\bResponsibilities?\b|\bLead\b|\bOwn\b|\bDrive\b|\bManage\b|$)/i,
  )
  if (!match) return []

  return [...new Set(
    match[1]
      .split(',')
      .map((skill) => normalizeWhitespace(skill))
      .filter(Boolean),
  )]
}

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
    .filter((record) => isIndiaJob(record))
    .map((record) => {
      const jobId = normalizeWhitespace(record.id)
      if (!jobId) return null

      const sourceUrl = buildJobUrl(jobId)
      const { location, city } = buildLocation(record)

      return {
        title: normalizeWhitespace(record.title),
        company: COMPANY,
        department: normalizeWhitespace(record.department),
        location,
        city,
        jobId,
        requisitionId: normalizeWhitespace(record.code) || jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeEmploymentType(record.job_type),
        experienceRequired: extractExperience(record, record.description_external),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: extractSkills(record.description_external),
        postingDate: toIsoDate(record.created_on),
        closingDate: null,
        jobDescription: stripHtml(record.description_external),
      }
    })
    .filter(Boolean)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'bataindia-html',
  timeoutMs: 15000,
})

const shouldFetchIframeSupplement = (summary, jobs) =>
  summary.totalCount > jobs.length || summary.hasNext

export const createBataIndiaScraper = ({
  maxIframePages = Number.isInteger(config.maxPages) ? config.maxPages : 5,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText

    try {
      const officialHomepageHtml = await fetchText(HOMEPAGE_URL)

      if (!hasOfficialCareersPageSignal(officialHomepageHtml)) {
        throw new Error('Bata India homepage no longer matches the verified official careers handoff')
      }

      if (extractSenseHqCareersUrl(officialHomepageHtml) !== normalizeUrl(CAREERS_BOARD_URL)) {
        throw new Error('Bata India homepage Careers link changed materially')
      }
    } catch (error) {
      if (!isOfficialPageTimeoutError(error)) {
        throw error
      }
    }

    const jobs = []
    const seenJobIds = new Set()

    const pushUniqueJobs = (entries) => {
      for (const job of entries) {
        if (!job?.jobId || seenJobIds.has(job.jobId)) continue
        seenJobIds.add(job.jobId)

        jobs.push({
          ...job,
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: new Date().toISOString(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return true
        }
      }

      return false
    }

    const rootHtml = await fetchText(CAREERS_BOARD_URL)
    const rootJobs = extractSearchResults(rootHtml)
    const rootSummary = extractBoardSummary(rootHtml)

    if (pushUniqueJobs(rootJobs)) {
      return jobs
    }

    if (!shouldFetchIframeSupplement(rootSummary, rootJobs)) {
      return jobs
    }

    const totalCount = rootSummary.totalCount || rootJobs.length

    for (let page = 1; page <= maxIframePages; page += 1) {
      const iframeHtml = await fetchText(buildIframeListingUrl({ page }))
      const iframeJobs = extractSearchResults(iframeHtml)

      if (pushUniqueJobs(iframeJobs)) {
        return jobs
      }

      if (iframeJobs.length === 0) break
      if (totalCount > 0 && jobs.length >= totalCount) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createBataIndiaScraper().run(options)

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
