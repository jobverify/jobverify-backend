import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { GLANCE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = GLANCE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const GREENHOUSE_BOARD_URL = PROVIDER_METADATA.greenhouseBoardUrl
export const GREENHOUSE_JOBS_API_URL = PROVIDER_METADATA.greenhouseJobsApiUrl
export const VERIFIED_SAMPLE_JOB_ID = '7443309'
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const decodeRepeatedHtmlEntities = (value, maxPasses = 4) => {
  let current = String(value ?? '')

  for (let index = 0; index < maxPasses; index += 1) {
    const decoded = decodeHtmlEntities(current)
    if (decoded === current) break
    current = decoded
  }

  return current.replace(/\u00a0/g, ' ').trim()
}

const extractMetadataValue = (job, fieldName) => {
  const match = (Array.isArray(job?.metadata) ? job.metadata : []).find(
    (entry) => normalizeWhitespace(entry?.name)?.toLowerCase() === fieldName.toLowerCase(),
  )

  const value = match?.value
  if (Array.isArray(value)) return normalizeWhitespace(value.join(', '))
  return normalizeWhitespace(value)
}

const hasIndiaMarker = (value) => /(?:^|,\s*)India(?:$|[\s,)(-])/i.test(String(value ?? ''))

const extractOfficeLocations = (job = {}) =>
  (Array.isArray(job?.offices) ? job.offices : [])
    .map((office) => normalizeWhitespace(office?.location || office?.name))
    .filter(Boolean)

const isIndiaJob = (job = {}) => {
  const baseCountry = extractMetadataValue(job, 'Base Country')
  if (baseCountry?.toLowerCase().includes('india')) return true

  const primaryLocation = normalizeWhitespace(job?.location?.name)
  if (hasIndiaMarker(primaryLocation)) return true
  if (/(bangalore|bengaluru)/i.test(primaryLocation || '')) return true

  return extractOfficeLocations(job).some((location) => hasIndiaMarker(location) || /(bangalore|bengaluru)/i.test(location))
}

const chooseIndiaLocation = (job = {}) => {
  const officeLocation = extractOfficeLocations(job).find(
    (location) => hasIndiaMarker(location) || /(bangalore|bengaluru)/i.test(location),
  )
  if (officeLocation) return officeLocation

  const primaryLocation = normalizeWhitespace(job?.location?.name)
  if (!primaryLocation) return null
  if (hasIndiaMarker(primaryLocation)) return primaryLocation
  if (/(bangalore|bengaluru)/i.test(primaryLocation)) return `${primaryLocation}, India`

  return null
}

const deriveCity = (location) => {
  const firstToken = normalizeWhitespace(location)?.split(',')[0]?.trim()
  if (!firstToken || /^india$/i.test(firstToken)) return null
  return normalizeCity(firstToken)
}

export const buildGreenhouseJobsApiUrl = () => `${GREENHOUSE_JOBS_API_URL}?content=true`

export const normalizeGreenhouseApplyUrl = (value, jobId) => {
  const canonicalJobId = normalizeWhitespace(jobId)
  if (!canonicalJobId) return null

  try {
    const url = new URL(value)
    const normalizedHost = url.hostname.replace(/^www\./i, '').toLowerCase()
    const normalizedPathname = url.pathname.replace(/\/+$/, '')

    if (normalizedHost !== 'job-boards.greenhouse.io') return null
    if (normalizedPathname !== `/glance/jobs/${canonicalJobId}`) return null

    return `https://job-boards.greenhouse.io/glance/jobs/${canonicalJobId}`
  } catch {
    return null
  }
}

export const normalizeFirstPartyJobUrl = (jobId) => {
  const canonicalJobId = normalizeWhitespace(jobId)
  if (!canonicalJobId) return null
  return `https://glance.com/careers/${canonicalJobId}`
}

export const extractNextDataPayload = (html = '') => {
  const match = String(html ?? '').match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  )

  if (!match) return null

  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

const flattenEmbeddedJobs = (jobsDepartmentWise = {}) =>
  Object.values(jobsDepartmentWise)
    .flatMap((entries) => (Array.isArray(entries) ? entries : []))
    .filter((entry) => entry && typeof entry === 'object')

export const extractEmbeddedFirstPartyJobs = (html = '') => {
  const payload = extractNextDataPayload(html)
  const jobs = flattenEmbeddedJobs(payload?.props?.pageProps?.jobsDepartmentWise)
  return jobs
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''
  const payload = extractNextDataPayload(page)
  const jobs = flattenEmbeddedJobs(payload?.props?.pageProps?.jobsDepartmentWise)

  return page.includes('__NEXT_DATA__')
    && payload?.page === '/careers/latest'
    && normalized.includes('Search')
    && normalized.includes('Everywhere')
    && normalized.includes('All')
    && normalized.includes('Glance AI, Inc. © 2026')
    && jobs.length > 0
    && jobs.some((job) => String(job?.id) === VERIFIED_SAMPLE_JOB_ID)
    && jobs.some((job) => isIndiaJob(job))
    && jobs.every((job) => normalizeGreenhouseApplyUrl(job?.absolute_url, job?.id))
}

export const extractIndiaJobsFromGreenhousePayload = (
  payload,
  {
    allowedJobIds = null,
    scrapedAt = new Date().toISOString(),
  } = {},
) => {
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : null
  if (!jobs) {
    throw new Error('Glance Greenhouse jobs API response no longer matches the expected payload')
  }

  return jobs
    .filter((job) => {
      if (!isIndiaJob(job)) return false
      if (!allowedJobIds) return true
      return allowedJobIds.has(String(job?.id))
    })
    .map((job) => {
      const location = chooseIndiaLocation(job)
      const applyUrl = normalizeGreenhouseApplyUrl(job?.absolute_url, job?.id)
      const sourceUrl = normalizeFirstPartyJobUrl(job?.id)
      const title = normalizeWhitespace(job?.title)
      const companyName = normalizeWhitespace(job?.company_name)

      if (companyName && companyName.toLowerCase() !== COMPANY.toLowerCase()) {
        throw new Error('Glance Greenhouse payload no longer maps to the verified company identity')
      }

      if (!location || !applyUrl || !sourceUrl || !title) {
        throw new Error('Glance Greenhouse payload no longer exposes the verified first-party detail route and apply handoff')
      }

      return {
        title,
        company: COMPANY,
        location,
        city: deriveCity(location),
        country: 'India',
        link: sourceUrl,
        applyUrl,
        sourceUrl,
        source: SOURCE,
        jobId: String(job?.id),
        requisitionId: normalizeWhitespace(job?.requisition_id),
        department: extractMetadataValue(job, 'Department Name (Career Site)'),
        employmentType: extractMetadataValue(job, 'Employment Type'),
        experienceRequired: null,
        jobDescription: decodeRepeatedHtmlEntities(job?.content) || null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: normalizeWhitespace(job?.updated_at || job?.first_published),
        remoteStatus: 'On-site',
        scrapedAt,
      }
    })
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  method: options.method,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Referer: CAREERS_URL,
    ...(options.headers || {}),
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createGlanceScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Glance verified first-party careers page no longer matches the trusted public surface')
    }

    const embeddedJobs = extractEmbeddedFirstPartyJobs(careersHtml)
    const allowedJobIds = new Set(
      embeddedJobs
        .filter((job) => isIndiaJob(job))
        .map((job) => String(job.id)),
    )

    const jobs = extractIndiaJobsFromGreenhousePayload(
      await fetchJson(buildGreenhouseJobsApiUrl(), { method: 'GET' }),
      {
        allowedJobIds,
        scrapedAt: now(),
      },
    )

    return Number.isFinite(maxJobs) ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createGlanceScraper(options).run(options)

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
