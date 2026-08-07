import path from 'path'
import { fileURLToPath } from 'url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'
import { createBrowserTextFallback } from '../../scraper-support/shared/browserTextFallback.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://www.pwc.in/careers/experienced-jobs.html'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const DETAIL_API_CONCURRENCY = 16
const WORKDAY_DETAIL_SESSION_LIMIT = 4
const DARWINBOX_DETAIL_SESSION_LIMIT = 2
const DETAIL_BROWSER_TIMEOUT_MS = 60000
const EXPLICIT_YEARS_PATTERN = /\b(\d+(?:\.\d+)?)(\+)?(?:\s*-\s*(\d+(?:\.\d+)?))?\s*(years?|yrs?)\b/gi

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripHtmlToText = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:article|div|h[1-6]|li|p|section|table|td|th|tr|ul)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractFirst = (pattern, value) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? match[1] : null
}

const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractMetaContent = (key, html) => {
  const escapedKey = escapeRegex(key)
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([\\s\\S]*?)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([\\s\\S]*?)["'][^>]+(?:property|name)=["']${escapedKey}["']`, 'i'),
  ]

  for (const pattern of patterns) {
    const value = extractFirst(pattern, html)
    if (value) return normalizeWhitespace(value)
  }

  return null
}

const parseEmbeddedArray = (pattern, html) => {
  const raw = extractFirst(pattern, html)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const normalizeTitle = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/^Job Position Title:\s*/i, '')
    .replace(/^IN[-_\s]+/i, '')
    .replace(/\u2013/g, ' - ')
    .replace(/_/g, ' '),
)
  ?.replace(/^\s*-\s*/, '')
  || null

const normalizeLocation = (value) => {
  const segments = String(value ?? '')
    .split(',')
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean)

  const uniqueSegments = [...new Set(segments)]
  if (!uniqueSegments.length) return null

  if (!uniqueSegments.some((segment) => /^india$/i.test(segment))) {
    uniqueSegments.push('India')
  }

  return uniqueSegments.join(', ')
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized || /^india$/i.test(normalized)) return null
  return normalized.split(',')[0]?.trim() || null
}

const shouldSkipRow = (row) => {
  const title = normalizeWhitespace(row?.title)
  if (!title) return true
  return /do not apply|testing purpose/i.test(title)
}

const toAbsoluteUrl = (value) => {
  if (!value) return null

  try {
    return new URL(value, CAREER_PAGE_URL).toString()
  } catch {
    return null
  }
}

const toWorkdayDetailUrl = (value) => {
  const absoluteUrl = toAbsoluteUrl(value)
  if (!absoluteUrl) return null

  try {
    const parsed = new URL(absoluteUrl)
    parsed.pathname = parsed.pathname.replace(/\/apply$/i, '')
    return parsed.toString()
  } catch {
    return absoluteUrl
  }
}

const extractDetailPageData = (html) => ({
  title: normalizeTitle(
    extractMetaContent('og:title', html)
      || extractFirst(/<title>\s*([\s\S]*?)\s*<\/title>/i, html),
  ),
  jobDescription: normalizeWhitespace(
    extractMetaContent('og:description', html)
      || extractMetaContent('description', html),
  ),
})

const enrichJobFromDetailPage = (job, detailHtml) => {
  const detail = extractDetailPageData(detailHtml)

  return {
    ...job,
    title: detail.title || job.title,
    jobDescription: detail.jobDescription || job.jobDescription,
  }
}

const extractEmbeddedRows = (html) => {
  const workdayRows = parseEmbeddedArray(
    /<!--\s*WDDATA\s*-->\s*var\s+jsondata\s*=\s*(\[[\s\S]*?\])\s*;/i,
    html,
  )
  const darwinboxRows = parseEmbeddedArray(
    /<!--\s*DBDATA\s*-->\s*var\s+dbdata\s*=\s*(\[[\s\S]*?\])\s*;/i,
    html,
  )

  return [
    ...darwinboxRows.map((row) => ({
      ...row,
      jobreqid: row.jobreqid || row.jobid,
    })),
    ...workdayRows,
  ]
}

const resolveExperienceEvidence = (...segments) => {
  const text = normalizeWhitespace(
    segments
      .map((segment) => stripHtmlToText(segment))
      .filter(Boolean)
      .join('\n\n'),
  )
  if (!text) return null

  if (/\bno experience required\b/i.test(text)) {
    return 'No experience required'
  }

  for (const match of text.matchAll(EXPLICIT_YEARS_PATTERN)) {
    const minimumYears = Number(match[1])
    const maximumYears = match[3] == null ? null : Number(match[3])

    if (!Number.isFinite(minimumYears)) {
      continue
    }

    if (maximumYears != null && (!Number.isFinite(maximumYears) || maximumYears < minimumYears)) {
      continue
    }

    return normalizeWhitespace(match[0])
  }

  return null
}

export const buildSearchUrl = () => CAREER_PAGE_URL

export const extractSearchResults = (html) => {
  const jobs = extractEmbeddedRows(html)
    .filter((row) => !shouldSkipRow(row))
    .map((row) => {
      const title = normalizeTitle(row.title)
      const department = normalizeWhitespace(row.los)
      const location = normalizeLocation(row.location)
      const jobId = normalizeWhitespace(row.jobreqid || row.jobid)
      const requisitionId = normalizeWhitespace(row.reqid || row.jobreqid || row.jobid)
      const applyUrl = toAbsoluteUrl(row.apply)
      const sourceUrl = /(?:my)?workdayjobs\.com/i.test(applyUrl || '')
        ? toWorkdayDetailUrl(applyUrl)
        : applyUrl

      if (!title || !location || !jobId || !requisitionId || !applyUrl || !sourceUrl) {
        return null
      }

      return {
        title,
        company: 'PwC',
        department,
        location,
        city: extractCity(location),
        jobId,
        requisitionId,
        sourceUrl,
        applyUrl,
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
    .sort((left, right) => left.title.localeCompare(right.title))

  return [...new Map(jobs.map((job) => [job.jobId, job])).values()]
}

const mapWithConcurrency = async (items, limit, iteratee) => {
  const concurrency = Math.max(1, Number.isInteger(limit) ? limit : 1)
  const results = new Array(items.length)
  let cursor = 0

  const worker = async () => {
    while (cursor < items.length) {
      const currentIndex = cursor
      cursor += 1
      results[currentIndex] = await iteratee(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )

  return results
}

const isBrowserFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

const resolveJobUrl = (job = {}) => job.sourceUrl || job.applyUrl || null

const isWorkdayJob = (job = {}) => /(?:my)?workdayjobs\.com/i.test(resolveJobUrl(job) || '')

const isDarwinboxJob = (job = {}) => /darwinbox\.com/i.test(resolveJobUrl(job) || '')

const buildWorkdayDetailApiUrl = (job = {}) => {
  const detailUrl = resolveJobUrl(job)
  if (!detailUrl || !isWorkdayJob(job)) return null

  try {
    const parsed = new URL(detailUrl)
    const segments = parsed.pathname.split('/').filter(Boolean)
    const jobIndex = segments.indexOf('job')
    const site = segments[0]
    const tenant = parsed.hostname.split('.')[0]
    const jobPath = segments
      .slice(jobIndex + 1)
      .filter(Boolean)
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join('/')

    if (!site || !tenant || jobIndex < 0 || !jobPath) return null
    return `${parsed.origin}/wday/cxs/${tenant}/${site}/job/${jobPath}`
  } catch {
    return null
  }
}

const buildDarwinboxDetailApiUrl = (job = {}) => {
  const detailUrl = resolveJobUrl(job)
  if (!detailUrl || !isDarwinboxJob(job)) return null

  try {
    const parsed = new URL(detailUrl)
    const segments = parsed.pathname.split('/').filter(Boolean)
    const jobDetailsIndex = segments.findIndex((segment) => /^jobdetails$/i.test(segment))
    const jobId = segments[jobDetailsIndex + 1] || null
    const companyId = segments[2] || 'main'

    if (jobDetailsIndex < 0 || !jobId) return null
    return `${parsed.origin}/ms/candidateapi/job/${encodeURIComponent(jobId)}?companyId=${encodeURIComponent(companyId)}`
  } catch {
    return null
  }
}

const resolveDetailApiRequest = (job = {}) => {
  if (isWorkdayJob(job)) {
    const url = buildWorkdayDetailApiUrl(job)
    return url ? { providerKind: 'workday', url } : null
  }

  if (isDarwinboxJob(job)) {
    const url = buildDarwinboxDetailApiUrl(job)
    return url ? { providerKind: 'darwinbox', url } : null
  }

  return null
}

const parseJson = (value) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const enrichJobFromWorkdayDetailPayload = (job, payload) => {
  const detail = payload?.jobPostingInfo
  if (!detail) return null

  const title = normalizeTitle(detail.title) || job.title
  const jobDescription = stripHtmlToText(detail.jobDescription)
  const experienceRequired = job.experienceRequired || resolveExperienceEvidence(detail.title, detail.jobDescription)

  return {
    ...job,
    title,
    jobDescription: jobDescription || job.jobDescription,
    experienceRequired,
    publicExperienceChecked: true,
  }
}

const enrichJobFromDarwinboxDetailPayload = (job, payload) => {
  const detail = payload?.message?.job?.[0]
  if (!detail) return null

  const title = normalizeTitle(
    detail.designation_display_name
      || detail.designation_title_name
      || detail.title,
  ) || job.title
  const jobDescription = stripHtmlToText(detail.jd)
  const experienceRequired = job.experienceRequired
    || normalizeWhitespace(detail.experience)
    || resolveExperienceEvidence(detail.designation_display_name, detail.jd)

  return {
    ...job,
    title,
    jobDescription: jobDescription || job.jobDescription,
    experienceRequired,
    publicExperienceChecked: true,
  }
}

const enrichJobFromDetailApiPayload = (job, detailApiRequest, rawPayload) => {
  const payload = parseJson(rawPayload)
  if (!payload) return null

  if (detailApiRequest?.providerKind === 'workday') {
    return enrichJobFromWorkdayDetailPayload(job, payload)
  }

  if (detailApiRequest?.providerKind === 'darwinbox') {
    return enrichJobFromDarwinboxDetailPayload(job, payload)
  }

  return null
}

const createBrowserApiFetchPool = async (seedUrl, sessionCount = 1) => {
  const browser = await launchBrowser()
  const sessions = []

  try {
    for (let index = 0; index < Math.max(1, sessionCount); index += 1) {
      const page = await createOptimizedPage(browser)
      await page.setUserAgent(USER_AGENT)
      await page.goto(seedUrl, {
        waitUntil: 'domcontentloaded',
        timeout: DETAIL_BROWSER_TIMEOUT_MS,
      })
      sessions.push({ page })
    }
  } catch (error) {
    await browser.close().catch(() => {})
    throw error
  }

  const queues = sessions.map(() => Promise.resolve())
  let sessionCursor = 0

  const fetchText = (url) => {
    const sessionIndex = sessionCursor % sessions.length
    sessionCursor += 1
    const runFetch = () => sessions[sessionIndex].page.evaluate(async (targetUrl) => {
      const response = await fetch(targetUrl, { credentials: 'include' })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${targetUrl}`)
      }

      return response.text()
    }, url)
    const next = queues[sessionIndex].then(runFetch, runFetch)
    queues[sessionIndex] = next.catch(() => {})
    return next
  }

  return {
    fetchText,
    close: async () => {
      await browser.close()
    },
  }
}

const createDetailApiFetcher = async (jobs = [], fetchDetailText = null) => {
  if (typeof fetchDetailText === 'function') {
    return {
      fetchText: fetchDetailText,
      close: async () => {},
    }
  }

  const pools = new Map()
  const workdayJobs = jobs.filter((job) => buildWorkdayDetailApiUrl(job))
  const darwinboxJobs = jobs.filter((job) => buildDarwinboxDetailApiUrl(job))

  if (workdayJobs.length) {
    pools.set(
      'workday',
      await createBrowserApiFetchPool(
        resolveJobUrl(workdayJobs[0]),
        Math.min(workdayJobs.length, WORKDAY_DETAIL_SESSION_LIMIT),
      ),
    )
  }

  if (darwinboxJobs.length) {
    pools.set(
      'darwinbox',
      await createBrowserApiFetchPool(
        resolveJobUrl(darwinboxJobs[0]),
        Math.min(darwinboxJobs.length, DARWINBOX_DETAIL_SESSION_LIMIT),
      ),
    )
  }

  return {
    fetchText: async (url, request = {}) => {
      const pool = pools.get(request.providerKind)
      if (!pool) {
        throw new Error(`No provider detail API fetcher is available for ${request.providerKind || url}`)
      }

      return pool.fetchText(url)
    },
    close: async () => {
      await Promise.allSettled(
        [...pools.values()].map((pool) => pool.close()),
      )
    },
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createPwcScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchText = options.fetchText || defaultFetchText
    const browserTextFallback = createBrowserTextFallback({
      fetchText,
      fetchBrowserText: options.fetchBrowserText,
      userAgent: USER_AGENT,
      shouldUseBrowserFallback: isBrowserFallbackError,
    })
    let detailApiFetcher = null

    try {
      const html = await browserTextFallback.fetchText(buildSearchUrl())
      const jobs = extractSearchResults(html)
      const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs
      detailApiFetcher = await createDetailApiFetcher(selectedJobs, options.fetchDetailText)
      const enrichedJobs = await mapWithConcurrency(
        selectedJobs,
        DETAIL_API_CONCURRENCY,
        async (job) => {
          if (!job.applyUrl || (job.jobDescription && job.experienceRequired)) {
            return job
          }

          const detailApiRequest = resolveDetailApiRequest(job)
          if (detailApiRequest) {
            try {
              const detailPayload = await detailApiFetcher.fetchText(detailApiRequest.url, detailApiRequest)
              const apiEnrichedJob = enrichJobFromDetailApiPayload(job, detailApiRequest, detailPayload)
              if (apiEnrichedJob) {
                return apiEnrichedJob
              }
            } catch {
              // Fall through to the rendered detail page when the provider API is unavailable.
            }
          }

          try {
            const detailHtml = await fetchText(job.sourceUrl || job.applyUrl)
            return enrichJobFromDetailPage(job, detailHtml)
          } catch {
            return job
          }
        },
      )

      return enrichedJobs.map((job) => ({
        ...job,
        source: 'pwc',
        link: job.sourceUrl || job.applyUrl,
        scrapedAt: new Date().toISOString(),
      }))
    } finally {
      await Promise.allSettled([
        browserTextFallback.close(),
        detailApiFetcher?.close?.(),
      ])
    }
  },
})

export const run = async () => createPwcScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running PwC scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'pwc')
    console.log('DB result:', result)
    process.exit(0)
  }
}
