import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../../scraper-support/utils/browser.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import MAGNIT_GLOBAL_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = MAGNIT_GLOBAL_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const DAYFORCE_ORIGIN = 'https://jobs.dayforcehcm.com'
export const DAYFORCE_CLIENT_NAMESPACE = PROVIDER_METADATA.dayforceClientNamespace
export const DAYFORCE_JOB_BOARD_CODE = PROVIDER_METADATA.dayforceJobBoardCode
export const DAYFORCE_JOB_BOARD_ID = PROVIDER_METADATA.dayforceJobBoardId
export const DAYFORCE_LOCALE = PROVIDER_METADATA.dayforceLocale
export const OFFICIAL_DAYFORCE_URL = PROVIDER_METADATA.dayforceBaseUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (html) => normalizeWhitespace(
  String(html ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const normalized = normalizeWhitespace(value)
    if (normalized) return normalized
  }

  return null
}

const isIndiaLocation = (location = {}) =>
  String(location.isoCountryCode ?? location.countryCode ?? '').toUpperCase() === 'IN'
  || /\bindia\b/i.test(String(location.formattedAddress ?? ''))

export const buildSearchApiUrl = () =>
  `${DAYFORCE_ORIGIN}/api/geo/${DAYFORCE_CLIENT_NAMESPACE}/jobposting/search`

export const buildSearchRequestPayload = (paginationStart = 0) => ({
  clientNamespace: DAYFORCE_CLIENT_NAMESPACE,
  jobBoardCode: DAYFORCE_JOB_BOARD_CODE,
  cultureCode: DAYFORCE_LOCALE,
  distanceUnit: 0,
  paginationStart,
})

export const buildJobDetailUrl = (jobPostingId) =>
  `${OFFICIAL_DAYFORCE_URL}/jobs/${jobPostingId}`

export const extractOfficialDayforceUrl = (html = '') => {
  const match = String(html).match(/https:\/\/jobs\.dayforcehcm\.com\/en-US\/prounlimited\/CANDIDATEPORTAL/i)
  return normalizeWhitespace(match?.[0])
}

export const hasOfficialMagnitCareersSignals = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page) || ''

  return /<title[^>]*>\s*Careers \| Magnit\s*<\/title>/i.test(page)
    && text.includes('Magnit Global is the Evolution of Work')
    && text.includes('India')
    && text.includes('Search Careers')
    && extractOfficialDayforceUrl(page) === OFFICIAL_DAYFORCE_URL
}

export const extractSearchPostings = (payload = {}) => {
  if (Array.isArray(payload.jobPostings)) return payload.jobPostings
  if (Array.isArray(payload.postings)) return payload.postings
  return []
}

export const normalizeSearchPosting = (posting = {}) => {
  const locations = Array.isArray(posting.postingLocations) ? posting.postingLocations : []
  const indiaLocation = locations.find(isIndiaLocation)
  if (!indiaLocation) return null

  const jobId = posting.jobPostingId
  const title = normalizeWhitespace(posting.jobTitle)
  if (!jobId || !title) return null

  return {
    title,
    company: COMPANY,
    department: null,
    location: firstNonEmpty(
      indiaLocation.formattedAddress,
      [indiaLocation.cityName, indiaLocation.stateCode, indiaLocation.isoCountryCode === 'IN' ? 'India' : null]
        .filter(Boolean)
        .join(', '),
    ),
    city: firstNonEmpty(indiaLocation.cityName, indiaLocation.location),
    country: 'India',
    jobId: String(jobId),
    requisitionId: String(posting.jobReqId ?? jobId),
    sourceUrl: buildJobDetailUrl(jobId),
    applyUrl: buildJobDetailUrl(jobId),
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeWhitespace(posting.postingStartTimestampUTC),
    closingDate: normalizeWhitespace(posting.postingExpiryTimestampUTC),
    jobDescription: stripTags(posting.jobDescription),
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: `${SOURCE}-html`,
  timeoutMs: 15000,
})

const createBrowserDayforceClient = async ({
  launchBrowserImpl = launchBrowser,
  createOptimizedPageImpl = createOptimizedPage,
} = {}) => {
  const browser = await launchBrowserImpl()

  try {
    const page = await createOptimizedPageImpl(browser)
    await page.goto(OFFICIAL_DAYFORCE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await page.waitForTimeout(5000)

    return {
      async searchJobPostings(payload = buildSearchRequestPayload()) {
        return page.evaluate(
          async ({ authUrl, searchUrl, requestPayload }) => {
            const csrfResponse = await fetch(authUrl, {
              credentials: 'include',
              headers: { Accept: 'application/json,text/plain,*/*' },
            })
            if (!csrfResponse.ok) {
              throw new Error(`HTTP ${csrfResponse.status} for ${authUrl}`)
            }

            const csrfPayload = await csrfResponse.json()
            const csrfToken = csrfPayload?.csrfToken
            if (!csrfToken) {
              throw new Error('Missing Dayforce CSRF token')
            }

            const response = await fetch(searchUrl, {
              method: 'POST',
              credentials: 'include',
              headers: {
                Accept: 'application/json,text/plain,*/*',
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken,
              },
              body: JSON.stringify(requestPayload),
            })

            if (!response.ok) {
              throw new Error(`HTTP ${response.status} for ${searchUrl}`)
            }

            return response.json()
          },
          {
            authUrl: `${DAYFORCE_ORIGIN}/api/auth/csrf`,
            searchUrl: buildSearchApiUrl(),
            requestPayload: payload,
          },
        )
      },
      async close() {
        await browser.close()
      },
    }
  } catch (error) {
    await browser.close()
    throw error
  }
}

export const createMagnitGlobalScraper = ({
  now = () => new Date().toISOString(),
  launchBrowserImpl = launchBrowser,
  createOptimizedPageImpl = createOptimizedPage,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    searchJobPostings,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialMagnitCareersSignals(careersHtml)) {
      throw new Error('Magnit verified first-party careers page no longer matches the pinned Dayforce handoff')
    }

    let browserClient = null

    try {
      if (!searchJobPostings) {
        browserClient = await createBrowserDayforceClient({
          launchBrowserImpl,
          createOptimizedPageImpl,
        })
        searchJobPostings = browserClient.searchJobPostings
      }

      const payload = await searchJobPostings(buildSearchRequestPayload(0))
      const jobs = extractSearchPostings(payload)
        .map((posting) => normalizeSearchPosting(posting))
        .filter(Boolean)

      return jobs.map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
      }))
    } finally {
      if (browserClient) {
        await browserClient.close()
      }
    }
  },
})

export const run = async (options = {}) => createMagnitGlobalScraper(options).run(options)

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
