import path from 'path'
import { fileURLToPath } from 'url'

import { fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const DEFAULT_COMPANY_NAME = 'Darwinbox'
const DEFAULT_SOURCE = 'darwinbox'
const DEFAULT_COMPANY_ID = 'main'
const DEFAULT_PAGE_SIZE = 10
const DEFAULT_ORIGIN = 'https://dbx.darwinbox.in'
const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
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

const normalizeOrigin = (value) =>
  (normalizeWhitespace(value) || DEFAULT_ORIGIN).replace(/\/+$/g, '')

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  return undefined
}

const extractSetCookieValues = (headers) => {
  if (!headers) return []

  if (typeof headers.getSetCookie === 'function') {
    const values = headers.getSetCookie()
    if (Array.isArray(values)) {
      return values.map((value) => normalizeWhitespace(value)).filter(Boolean)
    }
  }

  const singleValue = normalizeWhitespace(headers.get?.('set-cookie'))
  return singleValue ? [singleValue] : []
}

const buildCookieHeader = (setCookieValues = []) => {
  const cookieValues = setCookieValues
    .map((value) => normalizeWhitespace(String(value).split(';')[0]))
    .filter(Boolean)

  return cookieValues.length > 0 ? cookieValues.join('; ') : null
}

const isRetryableDarwinboxListingError = (error) => {
  if (!error) return false
  if (error.status === 403) return true

  const message = normalizeWhitespace(error.message) || ''
  return /(?:^| )HTTP 403\b|Forbidden HTML response/i.test(message)
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/remote/i.test(normalized)) return 'Remote'

  const parts = normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  const firstPart = parts[0] || normalized
  const secondPart = parts[1] || null
  const looksLikeOfficeCode = /^[A-Z0-9]{2,5}$/.test(firstPart)

  if (looksLikeOfficeCode && secondPart && !/india/i.test(secondPart)) {
    return secondPart
  }

  return firstPart
}

const isIndiaJob = (record) => {
  const location = normalizeWhitespace(record?.locations)
  const country = normalizeWhitespace(record?.country)
  return /india/i.test(location || '') || /india/i.test(country || '')
}

export const createDarwinboxScraper = ({
  companyName = DEFAULT_COMPANY_NAME,
  source = DEFAULT_SOURCE,
  companyId = DEFAULT_COMPANY_ID,
  pageSize = DEFAULT_PAGE_SIZE,
  origin = DEFAULT_ORIGIN,
  fetchImpl = fetch,
} = {}) => {
  const portalOrigin = normalizeOrigin(origin)
  const requestTimeoutMs = Math.max(Number(config.jobListingTimeoutMs) || 0, 30000)
  let publicSessionCookieHeader = null
  const invokeFetchImpl = (url, requestInit) => (
    fetchImpl === globalThis.fetch
      ? globalThis.fetch(url, requestInit)
      : fetchImpl(url, requestInit)
  )

  const buildCareersPageUrl = (targetCompanyId = companyId) =>
    `${portalOrigin}/ms/candidatev2/${targetCompanyId}/careers/allJobs`

  const buildListingApiUrl = (targetCompanyId = companyId) =>
    `${portalOrigin}/ms/candidateapi/job/alljobs?companyId=${targetCompanyId}`

  const buildJobDetailUrl = (jobId, targetCompanyId = companyId) =>
    `${portalOrigin}/ms/candidatev2/${targetCompanyId}/careers/jobDetails/${normalizeWhitespace(jobId) || ''}`

  const updatePublicSessionCookieHeader = (headers) => {
    const nextCookieHeader = buildCookieHeader(extractSetCookieValues(headers))
    if (nextCookieHeader) {
      publicSessionCookieHeader = nextCookieHeader
    }
    return publicSessionCookieHeader
  }

  const cookieAwareFetchImpl = async (url, requestInit) => {
    const response = await invokeFetchImpl(url, requestInit)
    updatePublicSessionCookieHeader(response?.headers)
    return response
  }

  const seedPublicSessionCookie = async (
    targetCompanyId = companyId,
    { forceRefresh = false } = {},
  ) => {
    if (!forceRefresh && publicSessionCookieHeader) return publicSessionCookieHeader

    try {
      await cookieAwareFetchImpl(buildCareersPageUrl(targetCompanyId), {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: createTimeoutSignal(requestTimeoutMs),
      })
    } catch {
      // Best effort only; some tenants may still allow the API without a seeded cookie.
    }

    return publicSessionCookieHeader
  }

  const extractSearchResults = (payload = {}) => (
    Array.isArray(payload?.data)
      ? payload.data
        .filter((record) => isIndiaJob(record))
        .map((record) => {
          const jobId = normalizeWhitespace(record.id)
          const location = normalizeWhitespace(record.locations)
          const jobDescription = normalizeWhitespace(record.jd)
          const experienceRequired = normalizeWhitespace(record.experience)

          if (!jobId || !location) return null

          return {
            title: normalizeWhitespace(record.title),
            company: companyName,
            department: normalizeWhitespace(record.department_name),
            location,
            city: extractCity(location),
            jobId,
            requisitionId: null,
            sourceUrl: buildJobDetailUrl(jobId),
            applyUrl: buildJobDetailUrl(jobId),
            employmentType: normalizeWhitespace(record.emp_type_name),
            experienceRequired,
            minimumQualification: null,
            preferredQualification: null,
            requiredSkills: [],
            postingDate: normalizeWhitespace(record.posted_on),
            closingDate: null,
            jobDescription,
            ...(jobDescription && !experienceRequired
              ? { publicExperienceChecked: true }
              : {}),
          }
        })
        .filter(Boolean)
      : []
  )

  const fetchListingPageFromApi = ({
    page: pageNumber,
    pageSize: targetPageSize = pageSize,
    companyId: targetCompanyId = companyId,
  }) => (async () => {
    const requestBody = JSON.stringify({
      companyId: targetCompanyId,
      sort_option: 'new',
      limit: targetPageSize,
      page: pageNumber,
    })

    for (let attemptNumber = 1; attemptNumber <= 2; attemptNumber += 1) {
      const cookieHeader = await seedPublicSessionCookie(targetCompanyId, { forceRefresh: true })
      const headers = {
        'User-Agent': USER_AGENT,
        Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
        'Content-Type': 'application/json',
        Origin: portalOrigin,
        Referer: buildCareersPageUrl(targetCompanyId),
      }

      if (cookieHeader) {
        headers.cookie = cookieHeader
      }

      try {
        return await fetchJsonWithRetry(buildListingApiUrl(targetCompanyId), {
          fetchImpl: cookieAwareFetchImpl,
          attempts: 1,
          method: 'POST',
          headers,
          body: requestBody,
          label: `${source}-darwinbox-listings`,
          timeoutMs: requestTimeoutMs,
        })
      } catch (error) {
        if (attemptNumber >= 2 || !isRetryableDarwinboxListingError(error)) {
          throw error
        }
      }
    }

    throw new Error(`[${source}] Darwinbox listings retry exhausted unexpectedly`)
  })()

  const run = async ({
    maxPages = config.maxPages,
    maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
    fetchListingPage = fetchListingPageFromApi,
  } = {}) => {
    const jobs = []
    let pageNumber = 1

    while (pageNumber <= maxPages) {
      const payload = await fetchListingPage({ page: pageNumber, pageSize, companyId })
      const results = extractSearchResults(payload)

      for (const job of results) {
        jobs.push({
          ...job,
          source,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: new Date().toISOString(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      const totalJobCount = Number.parseInt(String(payload?.job_counts ?? ''), 10)
      const hasMore = Number.isFinite(totalJobCount)
        ? pageNumber * pageSize < totalJobCount
        : Array.isArray(payload?.data) && payload.data.length === pageSize

      if (!hasMore) break
      pageNumber += 1
    }

    return jobs
  }

  return {
    buildCareersPageUrl,
    buildListingApiUrl,
    buildJobDetailUrl,
    extractSearchResults,
    fetchListingPageFromApi,
    run,
  }
}

const scraper = createDarwinboxScraper()

export const {
  buildCareersPageUrl,
  buildListingApiUrl,
  buildJobDetailUrl,
  extractSearchResults,
  run,
} = scraper

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Darwinbox scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)
  const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort()
  console.log(`Cities found: ${cities.join(', ')}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, DEFAULT_SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
