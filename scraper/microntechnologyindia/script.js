import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runApiPortalScraper } from '../../scraper-support/apiPortal/engine.js'
import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { extractJobFilterSignals } from '../../src/utils/jobFilterSignals.js'

import MICRON_TECHNOLOGY_INDIA_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const DETAIL_API_PATTERN = /\/api\/pcsx\/position_details\b/i
const DETAIL_FETCH_CONCURRENCY = 6

export const SEARCH_PAGE_SIZE = 10
export const SEARCH_TIMEOUT_MS = 120000
export const API_CAREERS_LANDING_URL = 'https://careers.micron.com/careers?domain=micron.com&location=India'

export const PROVIDER_METADATA = MICRON_TECHNOLOGY_INDIA_CATALOG
export const SOURCE = MICRON_TECHNOLOGY_INDIA_CATALOG.source
export const COMPANY = MICRON_TECHNOLOGY_INDIA_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = MICRON_TECHNOLOGY_INDIA_CATALOG.officialBrandName
export const VERIFIED_ON = MICRON_TECHNOLOGY_INDIA_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = MICRON_TECHNOLOGY_INDIA_CATALOG.verifiedSurfaceSummary
export const HOMEPAGE_URL = MICRON_TECHNOLOGY_INDIA_CATALOG.homepageUrl
export const OFFICIAL_CAREERS_URL = MICRON_TECHNOLOGY_INDIA_CATALOG.companyCareerPage
export const PUBLIC_BOARD_URL = MICRON_TECHNOLOGY_INDIA_CATALOG.publicBoardUrl
export const LISTING_API_URL = MICRON_TECHNOLOGY_INDIA_CATALOG.listingApiUrl

const API_QUERY = MICRON_TECHNOLOGY_INDIA_CATALOG.apiQuery

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const parseJsonText = (rawText, url) => {
  try {
    return JSON.parse(String(rawText ?? '').trim())
  } catch (error) {
    throw new Error(`Micron JSON fetch returned invalid JSON for ${url}: ${error.message}`)
  }
}

const fetchMicronDetailJson = async (url) => parseJsonText(
  await fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json, text/plain, */*',
      Referer: API_CAREERS_LANDING_URL,
      Origin: 'https://careers.micron.com',
    },
    label: `${SOURCE}-detail-json`,
    timeoutMs: 20000,
  }),
  url,
)

const normalizeMicronExperienceRequired = (jobDescription) => {
  const normalizedDescription = normalizeWhitespace(jobDescription)
  if (!normalizedDescription) return null

  const experienceProfile = extractJobFilterSignals({
    description: normalizedDescription,
  })?.experienceProfile
  const evidence = normalizeWhitespace(experienceProfile?.evidence)
  if (!evidence || experienceProfile?.confidence !== 'high') {
    return null
  }

  return (
    experienceProfile.minimumYears === 0 && experienceProfile.maximumYears === 0
      ? 'No experience required'
      : evidence
  )
}

const normalizeMicronPostingDate = (value) => {
  const numeric = Number(value)
  if (Number.isFinite(numeric) && numeric >= 1000000000 && numeric < 10000000000) {
    return new Date(numeric * 1000).toISOString()
  }

  return value ?? null
}

const decorateMicronJob = (job = {}) => {
  const normalizedDescription = normalizeWhitespace(job.jobDescription)

  return {
    ...job,
    experienceRequired:
      normalizeMicronExperienceRequired(job.jobDescription)
      || job.experienceRequired
      || null,
    postingDate: normalizeMicronPostingDate(job.postingDate),
    publicExperienceChecked: Boolean(normalizedDescription),
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

export const buildListingApiUrl = ({
  start = 0,
  limit = SEARCH_PAGE_SIZE,
} = {}) => {
  const url = new URL(LISTING_API_URL)
  url.searchParams.set('domain', API_QUERY.domain)
  url.searchParams.set('query', API_QUERY.query)
  url.searchParams.set('location', API_QUERY.location)
  url.searchParams.set('start', String(start))
  url.searchParams.set('limit', String(limit))
  return url.toString()
}

export const buildDetailApiUrl = (jobId) =>
  `https://careers.micron.com/api/pcsx/position_details?position_id=${jobId}&domain=micron.com&hl=en`

export const isIndiaLocation = (value = '') => /india/i.test(String(value ?? ''))

export const hasOfficialMicronIndiaCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page).toLowerCase()

  return (
    /<title>\s*Careers\s*\|\s*Micron(?:\s+India|\s+Technology Inc\.)\s*<\/title>/i.test(page)
    && text.includes('micron')
    && text.includes('search current jobs')
    && text.includes('hyderabad')
    && text.includes('india')
    && page.includes(PUBLIC_BOARD_URL)
  )
}

const isTargetClosedError = (error) =>
  /Target closed/i.test(String(error?.message || error))

const closeBrowserSession = async (browserSession) => {
  try {
    await browserSession.close()
  } catch (error) {
    if (!isTargetClosedError(error)) {
      throw error
    }
  }
}

const isRetriableBrowserFetchError = (error) =>
  /ERR_ABORTED|Access denied|Target closed|Execution context was destroyed|Protocol error/i
    .test(String(error?.message || error))

const parseBrowserJsonText = (rawText, url) => {
  try {
    return JSON.parse(String(rawText ?? '').trim())
  } catch (error) {
    throw new Error(`Micron browser fetch returned invalid JSON for ${url}: ${error.message}`)
  }
}

const createMicronBrowserJsonFetcher = async ({
  createBrowserFetchSessionImpl = createBrowserFetchSession,
} = {}) => {
  let browserSession = null

  const ensureSession = async () => {
    if (!browserSession) {
      browserSession = await createBrowserFetchSessionImpl({
        userAgent: USER_AGENT,
        timeoutMs: SEARCH_TIMEOUT_MS,
      })
    }

    return browserSession
  }

  const resetSession = async () => {
    if (browserSession) {
      await closeBrowserSession(browserSession)
      browserSession = null
    }
  }

  return {
    fetchJson: async (url) => {
      let lastError = null

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        const activeSession = await ensureSession()

        try {
          return parseBrowserJsonText(
            await activeSession.fetchText(url, {
              referer: API_CAREERS_LANDING_URL,
            }),
            url,
          )
        } catch (error) {
          lastError = error
          await resetSession()

          if (!isRetriableBrowserFetchError(error) || attempt === 2) {
            throw error
          }
        }
      }

      throw lastError
    },
    close: resetSession,
  }
}

export const buildMicronTechnologyIndiaApiProvider = () => ({
  source: SOURCE,
  companyName: COMPANY,
  companyCareerPage: OFFICIAL_CAREERS_URL,
  countryFilter: 'India',
  config: {
    discovery: {
      listingApiUrl: LISTING_API_URL,
    },
    request: {
      method: 'GET',
      query: API_QUERY,
    },
    pagination: {
      strategy: 'offset-limit',
      pageSize: SEARCH_PAGE_SIZE,
      offsetParam: 'start',
      limitParam: 'limit',
      resultsPath: 'data.positions',
      totalCountPath: 'data.count',
    },
    mapping: {
      title: 'name',
      location: 'locations.0',
      jobId: 'id',
      requisitionId: 'displayJobId',
      sourceUrl: {
        strategy: 'template',
        template: 'https://careers.micron.com{{positionUrl}}',
        values: {
          positionUrl: 'positionUrl',
        },
      },
      applyUrl: {
        strategy: 'template',
        template: 'https://careers.micron.com{{positionUrl}}',
        values: {
          positionUrl: 'positionUrl',
        },
      },
      department: 'department',
      postingDate: 'postedTs',
    },
    detail: {
      enabled: true,
      concurrency: DETAIL_FETCH_CONCURRENCY,
      urlTemplate: buildDetailApiUrl('{{jobId}}'),
      method: 'GET',
      mapping: {
        jobDescription: 'data.jobDescription',
      },
    },
    resultFilter: {
      include: [
        {
          field: 'location',
          pattern: 'india|hyderabad|bengaluru|bangalore|gujarat',
        },
      ],
      exclude: [],
    },
  },
})

export const createMicronTechnologyIndiaScraper = ({
  createBrowserFetchSessionImpl = createBrowserFetchSession,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson,
  } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialMicronIndiaCareersSignal(careersHtml)) {
      throw new Error('The verified Micron India careers page no longer matches the public jobs handoff')
    }

    let browserFetcher = null

    try {
      const liveFetchJson = fetchJson || await (async () => {
        browserFetcher = await createMicronBrowserJsonFetcher({
          createBrowserFetchSessionImpl,
        })

        return async (url) => {
          if (DETAIL_API_PATTERN.test(url)) {
            try {
              return await fetchMicronDetailJson(url)
            } catch {
              return browserFetcher.fetchJson(url)
            }
          }

          return browserFetcher.fetchJson(url)
        }
      })()

      const jobs = await runApiPortalScraper({
        provider: buildMicronTechnologyIndiaApiProvider(),
        fetchJson: liveFetchJson,
      })

      return jobs.map(decorateMicronJob)
    } finally {
      if (browserFetcher) {
        await browserFetcher.close()
      }
    }
  },
})

export const run = async () => createMicronTechnologyIndiaScraper().run()

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
