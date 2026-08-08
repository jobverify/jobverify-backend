import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://jobs.tatacommunications.com/'
export const HOME_URL = 'https://jobs.tatacommunications.com/home'
export const WORKSPACE_DOMAIN = 'jobs.tatacommunications.com'
export const WORKSPACE_ID = 'TCLPROD-c62po'
export const API_BASE = 'https://io.spire2grow.com/ies/v1/p'
export const WORKSPACE_BOOTSTRAP_URL = `${API_BASE}/workspaceId?domain=${WORKSPACE_DOMAIN}`
export const DEFAULT_PAGE_SIZE = 25
export const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const INDIA_COUNTRY = 'India'
const REQUEST_ACCEPT = 'application/json, text/plain, */*'
const CAREER_PAGE_ORIGIN = new URL(CAREER_PAGE_URL).origin
const HOME_PAGE_HOST = new URL(HOME_URL).host

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&amp;/gi, '&')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return normalized

  const year = parsed.getUTCFullYear()
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const day = String(parsed.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const normalizeLocationPart = (value) => normalizeWhitespace(value)

const buildLocation = (location = {}) => {
  if (!location || typeof location !== 'object') return null

  const parts = [
    normalizeLocationPart(location.city || location.locationCity),
    normalizeLocationPart(location.state || location.region || location.locationState),
    normalizeLocationPart(location.country || location.locationCountry),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : null
}

const extractCity = (location) => normalizeWhitespace(location)?.split(',')[0] || null

const getLocations = (record = {}) => {
  if (Array.isArray(record.locations)) return record.locations
  if (Array.isArray(record.location)) return record.location
  if (record.location && typeof record.location === 'object') return [record.location]
  return []
}

const isIndiaLocation = (location = {}) =>
  normalizeWhitespace(location.country || location.locationCountry)?.toLowerCase() === INDIA_COUNTRY.toLowerCase()

const pickIndiaLocation = (record = {}) => getLocations(record).find((location) => isIndiaLocation(location)) || null

const joinDescriptionParts = (...parts) => normalizeWhitespace(
  parts
    .map((part) => stripTags(part))
    .filter(Boolean)
    .join(' '),
)

const normalizeSkill = (value) => {
  if (typeof value === 'string') return normalizeWhitespace(value)
  return normalizeWhitespace(value?.skill || value?.name)
}

const normalizeSkillsList = (value) => {
  const seenSkills = new Set()

  return String(value ?? '')
    .split(',')
    .map((skill) => normalizeWhitespace(skill))
    .filter(Boolean)
    .filter((skill) => {
      const key = skill.toLowerCase()
      if (seenSkills.has(key)) return false
      seenSkills.add(key)
      return true
    })
}

const normalizeRenderedLines = (value) => String(value ?? '')
  .split(/\r?\n/)
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const isIndiaLocationText = (value) =>
  /\bindia\b/i.test(normalizeWhitespace(value) || '')

const resolveNowDate = (value) => {
  const fallback = new Date()

  if (value == null) return fallback

  const resolved = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return Number.isNaN(resolved.getTime()) ? fallback : resolved
}

const formatUtcDate = (value) => {
  const date = resolveNowDate(value)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseRelativePostingDate = (value, { nowDate = new Date() } = {}) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null

  const relativeMatch = normalized.match(/posted\s+(\d+)\s+(minute|hour|day|week|month)s?\s+ago/)
  if (!relativeMatch) return null

  const amount = Number(relativeMatch[1])
  const unit = relativeMatch[2]
  const unitToMilliseconds = {
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  }
  const durationMs = unitToMilliseconds[unit]

  if (!durationMs || !Number.isFinite(amount)) {
    return null
  }

  return formatUtcDate(new Date(resolveNowDate(nowDate).getTime() - amount * durationMs))
}

export const extractRenderedDetailCards = (pageText) => {
  const lines = normalizeRenderedLines(pageText)
  const detailCards = []

  for (let index = 0; index < lines.length - 4; index += 1) {
    const jobIdMatch = lines[index].match(/^Job ID\s+(\d+)$/i)
    if (!jobIdMatch) continue

    detailCards.push({
      jobId: jobIdMatch[1],
      location: lines[index + 1] || null,
      skillsText: lines[index + 2] || null,
      experienceRequired: lines[index + 3] || null,
      postedLabel: lines[index + 4] || null,
    })
  }

  return detailCards
}

export const extractRenderedTitleCards = (pageText) => {
  const lines = normalizeRenderedLines(pageText)
  const titles = []
  const startIndex = lines.indexOf('Posting Date')

  if (startIndex === -1) {
    return titles
  }

  for (let index = startIndex + 1; index < lines.length - 2; index += 1) {
    const title = lines[index]
    const skillsText = lines[index + 1]
    const action = lines[index + 2]

    if (title === 'TATA COMMUNICATIONS') {
      break
    }

    if (!title || !skillsText || action !== 'Apply') {
      continue
    }

    titles.push({
      title,
      skillsText,
    })
    index += 2
  }

  return titles
}

export const extractRenderedJobs = (pageText, { nowDate = new Date() } = {}) => {
  const detailCards = extractRenderedDetailCards(pageText)
  const titleCards = [...extractRenderedTitleCards(pageText)]
  const jobs = []

  for (const detailCard of detailCards) {
    if (!isIndiaLocationText(detailCard.location)) {
      continue
    }

    const matchingTitleIndex = titleCards.findIndex((titleCard) =>
      normalizeWhitespace(titleCard.skillsText)?.toLowerCase()
        === normalizeWhitespace(detailCard.skillsText)?.toLowerCase())
    const titleCard = matchingTitleIndex >= 0
      ? titleCards.splice(matchingTitleIndex, 1)[0]
      : titleCards.shift()

    if (!titleCard?.title) {
      continue
    }

    const requiredSkills = normalizeSkillsList(titleCard.skillsText || detailCard.skillsText)
    const location = normalizeWhitespace(detailCard.location)

    jobs.push({
      title: titleCard.title,
      company: 'Tata Communications',
      department: null,
      location,
      city: extractCity(location),
      jobId: detailCard.jobId,
      requisitionId: detailCard.jobId,
      sourceUrl: HOME_URL,
      applyUrl: HOME_URL,
      employmentType: null,
      experienceRequired: normalizeWhitespace(detailCard.experienceRequired),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills,
      postingDate: parseRelativePostingDate(detailCard.postedLabel, { nowDate }),
      closingDate: null,
      jobDescription: joinDescriptionParts(
        titleCard.title,
        location,
        requiredSkills.length > 0 ? `Skills: ${requiredSkills.join(', ')}` : null,
        detailCard.experienceRequired ? `Experience: ${detailCard.experienceRequired}` : null,
        detailCard.postedLabel,
      ),
    })
  }

  return jobs
}

const getSkills = (record = {}) => {
  const values = Array.isArray(record.skills)
    ? record.skills
    : Array.isArray(record.skillSet)
      ? record.skillSet
      : []

  return values
    .map((value) => normalizeSkill(value))
    .filter(Boolean)
}

const getListingPayload = (payload = {}) => payload.data || payload
const getDetailPayload = (payload = {}) => payload.data?.requisition || payload.data || payload

export const buildListingApiUrl = () => `${API_BASE}/${WORKSPACE_ID}/requisition/_search`

export const buildDetailApiUrl = (displayId) =>
  `${API_BASE}/${WORKSPACE_ID}/requisition/displayId/${encodeURIComponent(normalizeWhitespace(displayId) || '')}`

export const buildBootstrapHeaders = () => ({
  Accept: REQUEST_ACCEPT,
  WorkspaceId: WORKSPACE_ID,
  language: 'en',
  Origin: CAREER_PAGE_ORIGIN,
  Referer: CAREER_PAGE_URL,
  'User-Agent': DEFAULT_USER_AGENT,
})

export const buildRequestHeaders = ({ workflowId }) => ({
  ...buildBootstrapHeaders(),
  'Content-Type': 'application/json',
  workflowId,
})

export const buildListingRequestBody = ({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) => ({
  page: Math.max(1, Number(page) || 1),
  limit: Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE),
  searchText: '',
  filters: {
    country: [INDIA_COUNTRY],
  },
  aggregations: ['country'],
})

export const extractWorkflowId = (payload = {}) =>
  normalizeWhitespace(
    (typeof payload === 'string' ? payload : null)
      || payload.workflowId
      || payload.workspaceId
      || payload.data?.workflowId
      || payload.data?.workspaceId
      || payload.data?.workspace?.workflowId
      || payload.data?.workspace?.workspaceId
      || payload.workspace?.workflowId
      || payload.workspace?.workspaceId,
  )

export const extractPaginationSummary = (payload, {
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) => {
  const listing = getListingPayload(payload)
  const totalPages = Number(listing.totalPages) || 0
  const totalRecords = Number(listing.totalRecords) || 0
  const currentPage = Math.max(1, Number(page) || 1)
  const limit = Number(listing.limit) || Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE)

  return {
    page: currentPage,
    pageSize: limit,
    totalRecords,
    totalPages,
    hasNext: totalPages > 0 ? currentPage < totalPages : currentPage * limit < totalRecords,
  }
}

export const extractSearchResults = (payload) => {
  const listing = getListingPayload(payload)
  const requisitions = Array.isArray(listing.requisitions) ? listing.requisitions : []

  return requisitions
    .map((record) => {
      const location = pickIndiaLocation(record)
      const jobId = normalizeWhitespace(record.displayId || record.jobId)
      const requisitionId = normalizeWhitespace(record.id || record.requisitionId) || jobId
      const sourceUrl = jobId ? buildDetailApiUrl(jobId) : null
      const resolvedLocation = buildLocation(location)

      if (!location || !jobId || !sourceUrl) return null

      return {
        title: normalizeWhitespace(record.title),
        company: 'Tata Communications',
        department: normalizeWhitespace(record.department || record.functionName),
        location: resolvedLocation,
        city: extractCity(resolvedLocation),
        jobId,
        requisitionId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeWhitespace(record.employmentType || record.jobType),
        experienceRequired: normalizeWhitespace(record.experienceRequired || record.experience),
        minimumQualification: normalizeWhitespace(record.minimumQualification || record.qualification),
        preferredQualification: null,
        requiredSkills: [],
        postingDate: normalizeDate(record.postedDate || record.postingDate),
        closingDate: normalizeDate(record.closingDate),
        jobDescription: joinDescriptionParts(record.summary, record.description),
      }
    })
    .filter((job) => job && job.title && job.location)
}

export const extractJobDetail = (payload, listing = {}) => {
  const detail = getDetailPayload(payload)
  const location = buildLocation(pickIndiaLocation(detail)) || listing.location || null
  const sourceUrl = listing.sourceUrl || buildDetailApiUrl(detail.displayId || detail.jobId || listing.jobId)

  return {
    title: normalizeWhitespace(detail.title) || listing.title || null,
    company: 'Tata Communications',
    department: normalizeWhitespace(detail.department || detail.functionName) || listing.department || null,
    location,
    city: extractCity(location) || listing.city || null,
    jobId: normalizeWhitespace(detail.displayId || detail.jobId) || listing.jobId || null,
    requisitionId: normalizeWhitespace(detail.id || detail.requisitionId) || listing.requisitionId || null,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: normalizeWhitespace(detail.employmentType || detail.jobType) || listing.employmentType || null,
    experienceRequired: normalizeWhitespace(detail.experienceRequired || detail.experience) || listing.experienceRequired || null,
    minimumQualification: normalizeWhitespace(detail.minimumQualification || detail.qualification) || listing.minimumQualification || null,
    preferredQualification: null,
    requiredSkills: getSkills(detail).length > 0 ? getSkills(detail) : listing.requiredSkills || [],
    postingDate: normalizeDate(detail.postedDate || detail.postingDate) || listing.postingDate || null,
    closingDate: normalizeDate(detail.closingDate) || listing.closingDate || null,
    jobDescription: joinDescriptionParts(
      detail.summary,
      detail.description,
      detail.responsibilities,
      detail.qualifications,
    ) || listing.jobDescription || null,
  }
}

const defaultFetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body == null ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  if (String(url) === WORKSPACE_BOOTSTRAP_URL) {
    const text = await response.text()

    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  return response.json()
}

export const createTataCommunicationsScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  pageSize = Number.isInteger(config.pageSize) ? config.pageSize : DEFAULT_PAGE_SIZE,
} = {}) => ({
  async run(options = {}) {
    const fetchJson = options.fetchJson || defaultFetchJson
    const nowDate = resolveNowDate((options.now || (() => new Date()))())

    const jobs = []
    const seenJobIds = new Set()
    const scrapedAt = nowDate.toISOString()

    const bootstrapPayload = await fetchJson(WORKSPACE_BOOTSTRAP_URL, {
      headers: buildBootstrapHeaders(),
    })
    const workflowId = extractWorkflowId(bootstrapPayload)

    if (!workflowId) {
      throw new Error('Missing workflowId in Tata Communications workspace bootstrap payload')
    }

    for (let page = 1; page <= maxPages; page += 1) {
        const listingPayload = await fetchJson(buildListingApiUrl(), {
          method: 'POST',
          headers: buildRequestHeaders({ workflowId }),
          body: buildListingRequestBody({ page, pageSize }),
        })
        const listings = extractSearchResults(listingPayload)
        const summary = extractPaginationSummary(listingPayload, { page, pageSize })

        for (const listing of listings) {
          if (seenJobIds.has(listing.jobId)) continue
          seenJobIds.add(listing.jobId)

          const detailPayload = await fetchJson(buildDetailApiUrl(listing.jobId), {
            headers: buildRequestHeaders({ workflowId }),
          })
          const detail = extractJobDetail(detailPayload, listing)

          jobs.push({
            ...detail,
            source: 'tatacommunications',
            link: detail.applyUrl || detail.sourceUrl,
            scrapedAt,
          })

          if (maxJobs && jobs.length >= maxJobs) {
            return jobs
          }
        }

        if (!summary.hasNext) {
          break
        }
      }

    return jobs
  },
})

export const run = async (options = {}) => createTataCommunicationsScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'tatacommunications')
  }
}
