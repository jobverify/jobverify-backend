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
export const JOBS_COUNT_URL = `${API_BASE}/requisition/_count`
export const DEFAULT_PAGE_SIZE = 25
export const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const COMPANY = 'Tata Communications'
const INDIA_COUNTRY = 'India'
const REQUEST_ACCEPT = 'application/json, text/plain, */*'
const CAREER_PAGE_ORIGIN = new URL(CAREER_PAGE_URL).origin

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

  const isoMatch = /^(\d{4}-\d{2}-\d{2})/.exec(normalized)
  if (isoMatch) return isoMatch[1]

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

  const fullyQualifiedLocation = normalizeLocationPart(
    location.fqLocationName || location.fullLocationName,
  )
  if (fullyQualifiedLocation) {
    return fullyQualifiedLocation
  }

  const parts = [
    normalizeLocationPart(location.city || location.locationCity),
    normalizeLocationPart(location.state || location.region || location.locationState),
    normalizeLocationPart(location.country || location.locationCountry),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(', ') : null
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  return normalized.split(',')[0]?.trim() || normalized
}

const getLocations = (record = {}) => {
  if (Array.isArray(record.jobLocation)) return record.jobLocation
  if (Array.isArray(record.locations)) return record.locations
  if (Array.isArray(record.location)) return record.location
  if (record.jobLocation && typeof record.jobLocation === 'object') return [record.jobLocation]
  if (record.location && typeof record.location === 'object') return [record.location]
  return []
}

const isIndiaLocation = (location = {}) => {
  const country = normalizeWhitespace(location.country || location.locationCountry)
  if (country?.toLowerCase() === INDIA_COUNTRY.toLowerCase()) {
    return true
  }

  return /\bindia\b/i.test(normalizeWhitespace(location.fqLocationName) || '')
}

const pickIndiaLocation = (record = {}) =>
  getLocations(record).find((location) => isIndiaLocation(location)) || null

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

const formatYears = (months) => {
  if (!Number.isFinite(months)) return null
  const years = months / 12
  return Number.isInteger(years) ? String(years) : String(Number(years.toFixed(1)))
}

const formatExperienceRange = (value) => {
  if (value == null) return null

  if (typeof value === 'number' || /^\d+$/.test(String(value).trim())) {
    const years = formatYears(Number(value))
    return years ? `${years}+ years` : null
  }

  if (typeof value === 'object') {
    const from = Number(
      value.from ?? value.min ?? value.minimum ?? value.start ?? value.lowerBound,
    )
    const to = Number(
      value.to ?? value.max ?? value.maximum ?? value.end ?? value.upperBound,
    )
    const fromYears = formatYears(from)
    const toYears = formatYears(to)

    if (fromYears && toYears && fromYears !== toYears) {
      return `${fromYears}-${toYears} years`
    }
    if (fromYears && toYears && fromYears === toYears) {
      return `${fromYears} years`
    }
    if (fromYears) {
      return `${fromYears}+ years`
    }
    if (toYears) {
      return `Up to ${toYears} years`
    }
  }

  return normalizeWhitespace(value)
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
      company: COMPANY,
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
      : Array.isArray(record.requiredSkills)
        ? record.requiredSkills
        : []

  const normalizedSkills = values
    .map((value) => normalizeSkill(value))
    .filter(Boolean)

  if (normalizedSkills.length > 0) {
    return [...new Set(normalizedSkills)]
  }

  if (typeof record.skills === 'string') {
    return normalizeSkillsList(record.skills)
  }

  return []
}

const getListingPayload = (payload = {}) => payload.data || payload
const getDetailPayload = (payload = {}) => payload.data?.requisition || payload.data || payload

const getListingEntities = (payload = {}) => {
  if (Array.isArray(payload?.entities)) return payload.entities

  const listing = getListingPayload(payload)
  if (Array.isArray(listing?.entities)) return listing.entities
  if (Array.isArray(listing?.requisitions)) return listing.requisitions
  return []
}

export const buildJobsCountUrl = () => JOBS_COUNT_URL

export const buildListingApiUrl = ({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  sortOrder = 'desc',
  sortField = 'postedOn',
} = {}) =>
  `${API_BASE}/requisition/_search?page=${Math.max(1, Number(page) || 1)}&size=${Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE)}&selectedSortOrder=${encodeURIComponent(normalizeWhitespace(sortOrder) || 'desc')}&selectedSortField=${encodeURIComponent(normalizeWhitespace(sortField) || 'postedOn')}`

export const buildJobUrl = (displayId, workspaceId = WORKSPACE_ID) =>
  `${CAREER_PAGE_ORIGIN}/jobs/${encodeURIComponent(normalizeWhitespace(displayId) || '')}?tenantId=${encodeURIComponent(normalizeWhitespace(workspaceId) || WORKSPACE_ID)}&ref=job-share-direct-link`

export const buildDetailApiUrl = (displayId, workspaceId = WORKSPACE_ID) =>
  buildJobUrl(displayId, workspaceId)

export const buildBootstrapHeaders = ({ workspaceId = WORKSPACE_ID } = {}) => ({
  Accept: REQUEST_ACCEPT,
  WorkspaceId: workspaceId,
  language: 'en',
  Origin: CAREER_PAGE_ORIGIN,
  Referer: CAREER_PAGE_URL,
  'User-Agent': DEFAULT_USER_AGENT,
})

export const buildRequestHeaders = ({
  workspaceId = WORKSPACE_ID,
  workflowId,
} = {}) => ({
  ...buildBootstrapHeaders({ workspaceId }),
  'Content-Type': 'application/json',
  ...(workflowId ? { workflowId } : {}),
})

export const buildListingRequestBody = ({
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  sortOrder = 'desc',
  sortField = 'postedOn',
} = {}) => ({
  page: Math.max(1, Number(page) || 1),
  size: Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE),
  selectedSortOrder: normalizeWhitespace(sortOrder) || 'desc',
  selectedSortField: normalizeWhitespace(sortField) || 'postedOn',
})

export const extractWorkspaceId = (payload = {}) =>
  normalizeWhitespace(
    (typeof payload === 'string' ? payload : null)
      || payload.workspaceId
      || payload.data?.workspaceId
      || payload.data?.workspace?.workspaceId
      || payload.workspace?.workspaceId,
  )

export const generateWorkflowId = ({ now = Date.now() } = {}) =>
  `WFU_${Math.max(1, Number(now) || Date.now())}`

export const extractWorkflowId = (payload = {}) =>
  normalizeWhitespace(
    (typeof payload === 'string' ? payload : null)
      || payload.workflowId
      || payload.data?.workflowId
      || payload.data?.workspace?.workflowId
      || payload.workspace?.workflowId,
  )

export const extractPaginationSummary = (payload, {
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
} = {}) => {
  const listing = getListingPayload(payload)
  const currentPage = Math.max(1, Number(page) || 1)
  const limit = Math.max(1, Number(pageSize) || DEFAULT_PAGE_SIZE)
  const totalRecords = Number(
    payload?.total
      ?? listing.total
      ?? payload?.totalCount
      ?? listing.totalCount
      ?? listing.totalRecords,
  ) || 0
  const totalPages = Number(listing.totalPages) || (totalRecords > 0
    ? Math.ceil(totalRecords / limit)
    : 0)
  const entityCount = getListingEntities(payload).length

  return {
    page: currentPage,
    pageSize: limit,
    totalRecords,
    totalPages,
    hasNext: totalPages > 0 ? currentPage < totalPages : entityCount >= limit,
  }
}

export const extractSearchResults = (payload, { workspaceId = WORKSPACE_ID } = {}) =>
  getListingEntities(payload)
    .map((record) => {
      const location = pickIndiaLocation(record)
      const jobId = normalizeWhitespace(record.displayId || record.jobId)
      const requisitionId = normalizeWhitespace(record.id || record.requisitionId) || jobId
      const resolvedLocation = buildLocation(location)
      const resolvedWorkspaceId = normalizeWhitespace(workspaceId)
        || normalizeWhitespace(record.workspaceId)
        || WORKSPACE_ID
      const status = normalizeWhitespace(
        record.jobStatus?.statusCode || record.jobPosting?.status || record.status,
      )

      if (
        !location
        || !jobId
        || !requisitionId
        || !resolvedLocation
        || (status && !/^(open|active)$/i.test(status))
      ) {
        return null
      }

      const sourceUrl = buildJobUrl(jobId, resolvedWorkspaceId)

      return {
        title: normalizeWhitespace(record.jobTitle || record.title),
        company: COMPANY,
        department: normalizeWhitespace(record.departmentName || record.department || record.functionName),
        location: resolvedLocation,
        city: normalizeWhitespace(location.city || location.locationCity) || extractCity(resolvedLocation),
        jobId,
        requisitionId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeWhitespace(record.employmentType || record.jobType),
        experienceRequired: formatExperienceRange(record.requiredExperienceInMonths)
          || normalizeWhitespace(record.experienceRequired || record.experience),
        minimumQualification: normalizeWhitespace(
          record.requiredEducation || record.minimumQualification || record.qualification,
        ),
        preferredQualification: null,
        requiredSkills: getSkills(record),
        postingDate: normalizeDate(
          record.jobPosting?.startDate
            || record.postedOn
            || record.postedDate
            || record.postingDate
            || record.createdOn
            || record.updatedOn,
        ),
        closingDate: normalizeDate(record.jobPosting?.endDate || record.closingDate),
        jobDescription: joinDescriptionParts(
          record.jobDescription,
          record.description,
          record.aboutCompany,
          record.summary,
        ),
      }
    })
    .filter((job) => job && job.title && job.location)

export const extractJobDetail = (payload, listing = {}, { workspaceId = WORKSPACE_ID } = {}) => {
  const detail = getDetailPayload(payload)
  const locationRecord = pickIndiaLocation(detail)
  const location = buildLocation(locationRecord) || listing.location || null
  const resolvedWorkspaceId = normalizeWhitespace(workspaceId)
    || normalizeWhitespace(detail.workspaceId)
    || WORKSPACE_ID
  const sourceUrl = buildJobUrl(
    detail.displayId || detail.jobId || listing.jobId,
    resolvedWorkspaceId,
  )

  return {
    title: normalizeWhitespace(detail.jobTitle || detail.title) || listing.title || null,
    company: COMPANY,
    department: normalizeWhitespace(detail.departmentName || detail.department || detail.functionName)
      || listing.department
      || null,
    location,
    city: normalizeWhitespace(locationRecord?.city || locationRecord?.locationCity)
      || listing.city
      || extractCity(location)
      || null,
    jobId: normalizeWhitespace(detail.displayId || detail.jobId) || listing.jobId || null,
    requisitionId: normalizeWhitespace(detail.id || detail.requisitionId) || listing.requisitionId || null,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: normalizeWhitespace(detail.employmentType || detail.jobType) || listing.employmentType || null,
    experienceRequired: formatExperienceRange(detail.requiredExperienceInMonths)
      || normalizeWhitespace(detail.experienceRequired || detail.experience)
      || listing.experienceRequired
      || null,
    minimumQualification: normalizeWhitespace(
      detail.requiredEducation || detail.minimumQualification || detail.qualification,
    ) || listing.minimumQualification || null,
    preferredQualification: null,
    requiredSkills: getSkills(detail).length > 0 ? getSkills(detail) : listing.requiredSkills || [],
    postingDate: normalizeDate(
      detail.jobPosting?.startDate
        || detail.postedOn
        || detail.postedDate
        || detail.postingDate,
    ) || listing.postingDate || null,
    closingDate: normalizeDate(detail.jobPosting?.endDate || detail.closingDate) || listing.closingDate || null,
    jobDescription: joinDescriptionParts(
      detail.jobDescription,
      detail.description,
      detail.responsibilities,
      detail.qualifications,
      detail.summary,
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
    const createWorkflowId = typeof options.createWorkflowId === 'function'
      ? options.createWorkflowId
      : ({ nowDate: activeNowDate }) => generateWorkflowId({ now: activeNowDate.getTime() })

    const jobs = []
    const seenJobIds = new Set()
    const scrapedAt = nowDate.toISOString()

    const bootstrapPayload = await fetchJson(WORKSPACE_BOOTSTRAP_URL, {
      headers: buildBootstrapHeaders(),
    })
    const workspaceId = extractWorkspaceId(bootstrapPayload) || WORKSPACE_ID
    const workflowId = (typeof bootstrapPayload === 'string' ? null : extractWorkflowId(bootstrapPayload))
      || createWorkflowId({ workspaceId, nowDate })

    if (!workspaceId) {
      throw new Error('Missing workspaceId in Tata Communications workspace bootstrap payload')
    }

    if (!workflowId) {
      throw new Error('Missing workflowId in Tata Communications workspace bootstrap payload')
    }

    for (let page = 1; page <= maxPages; page += 1) {
      const listingPayload = await fetchJson(buildListingApiUrl({ page, pageSize }), {
        method: 'GET',
        headers: buildRequestHeaders({ workspaceId, workflowId }),
      })
      const listings = extractSearchResults(listingPayload, { workspaceId })
      const summary = extractPaginationSummary(listingPayload, { page, pageSize })

      for (const listing of listings) {
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        jobs.push({
          ...listing,
          source: 'tatacommunications',
          link: listing.applyUrl || listing.sourceUrl,
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
