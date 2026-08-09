import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { extractJobDetail } from '../../scraper-support/detailExtractors/index.js'
import { extractCity } from '../../scraper-support/myworkday/engine.js'
import { extractWorkdayDetailLocations } from '../../scraper-support/myworkday/locationDetails.js'
import { EVEREST_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = EVEREST_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const CAREERS_OVERVIEW_URL = PROVIDER_METADATA.careerOverviewUrl
export const WORKDAY_BOARD_URL = PROVIDER_METADATA.officialJobsBoardUrl
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl
export const SAMPLE_JOB_DETAIL_URL = PROVIDER_METADATA.sampleJobDetailUrl

const PAGE_SIZE = 20
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const INDIA_LOCATION_PATTERN =
  /\b(?:india|bengaluru|bangalore|gurgaon|gurugram|mumbai|pune|hyderabad|chennai|noida|new delhi|delhi|kolkata|ahmedabad)\b/i

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1]) || null
}

const extractLinks = (html = '') => (
  [...String(html ?? '').matchAll(/href=["']([^"'#]+)["']/gi)]
    .map((match) => match[1].trim())
    .filter(Boolean)
)

const startOfTodayIst = () => {
  const istOffsetMs = 5.5 * 60 * 60 * 1000
  const nowIst = new Date(Date.now() + istOffsetMs)
  return new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate()))
}

const toUtcMidnight = (dateStr) => {
  const parsed = new Date(dateStr)
  if (Number.isNaN(parsed.getTime())) return null
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()))
}

const parsePostedOn = (raw) => {
  if (!raw) return null

  const text = String(raw).trim().toLowerCase()
  const today = startOfTodayIst()
  const daysAgo = (days) => {
    const value = new Date(today)
    value.setUTCDate(value.getUTCDate() - days)
    return value
  }

  if (/\btoday\b/.test(text)) return daysAgo(0)
  if (/\byesterday\b/.test(text)) return daysAgo(1)

  const relativeMatch = text.match(/(\d+)\s+days?\s+ago/)
  if (relativeMatch) {
    return daysAgo(Number.parseInt(relativeMatch[1], 10))
  }

  if (/30\+/.test(text)) return daysAgo(30)

  return toUtcMidnight(String(raw).replace(/^posted\s+/i, '').trim())
}

const emptyDetailPayload = () => ({
  locations: [],
  jobDescription: null,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  experienceRequired: null,
  department: null,
  requisitionId: null,
})

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const defaultFetchJson = async (url, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      origin: 'https://wd5.myworkdaysite.com',
      referer: WORKDAY_BOARD_URL,
      'user-agent': USER_AGENT,
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const hasOfficialHomepageSignal = (page = {}) => {
  const rawHtml = String(page?.html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return Number(page?.status) === 200
    && extractTitle(rawHtml) === 'Welcome to Everest | Everest'
    && /https:\/\/www\.everestglobal\.com\/us-en/i.test(String(page?.url ?? ''))
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.everestglobal\.com\/us-en["']/i.test(rawHtml)
    && normalized.includes('We underwrite opportunity.')
    && rawHtml.includes('/us-en/career-opportunities')
    && rawHtml.includes('/us-en/about-us')
}

export const hasOfficialCareersSignal = (page = {}) => {
  const rawHtml = String(page?.html ?? '')
  const normalized = normalizeWhitespace(rawHtml)
  const hasLegacyHero = /<h1[^>]*>\s*Careers\s*<\/h1>/i.test(rawHtml)
  const hasCurrentHero = normalized.includes('Your opportunity starts here')
  const hasTrustedCopy = normalized.includes('Ready to take your next step?')
    || normalized.includes('Where could your career take you?')

  return Number(page?.status) === 200
    && extractTitle(rawHtml) === 'Careers | Everest'
    && String(page?.url ?? '') === CAREERS_OVERVIEW_URL
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.everestglobal\.com\/us-en\/career-opportunities\/overview["']/i.test(rawHtml)
    && (hasLegacyHero || hasCurrentHero)
    && hasTrustedCopy
    && /(Search Jobs|View Job Openings)/i.test(normalized)
}

const isVerifiedWorkdayBoardUrl = (value) => {
  try {
    const url = new URL(value)
    return url.origin === 'https://wd5.myworkdaysite.com'
      && url.pathname === '/recruiting/everestre/careers'
  } catch {
    return false
  }
}

export const extractVerifiedWorkdayBoardUrl = (html = '') => {
  for (const link of extractLinks(html)) {
    if (isVerifiedWorkdayBoardUrl(link)) {
      return new URL(link).toString()
    }
  }

  return null
}

export const hasOfficialWorkdayBoardSignal = (page = {}) => {
  const rawHtml = String(page?.html ?? '')

  return Number(page?.status) === 200
    && String(page?.url ?? '') === WORKDAY_BOARD_URL
    && /<meta[^>]+property=["']og:title["'][^>]+content=["']Careers["']/i.test(rawHtml)
    && rawHtml.includes('https://wd5.myworkdaysite.com/recruiting/everestre/careers')
    && rawHtml.includes('tenant: "everestre"')
    && /Beware of recruitment fraud/i.test(rawHtml)
    && /EVEREST is a leading international reinsurance and insurance group/i.test(rawHtml)
}

export const isIndiaLocation = (value = '') => INDIA_LOCATION_PATTERN.test(String(value ?? ''))

export const isGroupedLocationLabel = (value = '') => /^\d+\s+Locations?$/i.test(String(value ?? '').trim())

export const buildJobsRequestBody = ({
  offset = 0,
  limit = PAGE_SIZE,
  searchText = '',
} = {}) => JSON.stringify({
  appliedFacets: {},
  limit,
  offset,
  searchText,
})

export const buildJobDetailUrl = (externalPath = '') => {
  if (!externalPath) return null
  return externalPath.startsWith('/')
    ? `${WORKDAY_BOARD_URL}${externalPath}`
    : new URL(externalPath, `${WORKDAY_BOARD_URL}/`).toString()
}

const extractJobId = (posting = {}) => {
  const requisition = Array.isArray(posting?.bulletFields)
    ? posting.bulletFields.find((value) => /^R\d+(?:-\d+)?$/i.test(String(value)))
    : null

  if (requisition) return requisition

  const match = String(posting?.externalPath ?? '').match(/_(R\d+(?:-\d+)?)(?:\/)?$/i)
  return match?.[1] ?? null
}

const selectPrimaryLocation = (summaryLocation, detailLocations = []) =>
  detailLocations.find((value) => isIndiaLocation(value)) || summaryLocation

const shouldContinuePagination = ({
  jobsCount,
  offsetAfterPage,
  payloadTotal,
  pageSize = PAGE_SIZE,
}) => {
  if (jobsCount < pageSize) return false
  if (payloadTotal > 0) return offsetAfterPage < payloadTotal
  return true
}

const hasValidJobsPayload = (payload) =>
  payload != null
  && Number.isInteger(payload.total)
  && Array.isArray(payload.jobPostings)

const extractDetailPayload = async (jobUrl, fetchPage) => {
  const page = await fetchPage(jobUrl)
  if (Number(page?.status) !== 200) {
    throw new Error(`HTTP ${page?.status} for ${jobUrl}`)
  }

  const html = String(page?.html ?? '')
  return {
    locations: extractWorkdayDetailLocations(html),
    ...(await extractJobDetail({ provider: 'workday', html })),
  }
}

export const createEverestScraper = ({
  maxPages = Number.POSITIVE_INFINITY,
} = {}) => ({
  async run(options = {}) {
    const fetchPage = options.fetchPage || defaultFetchPage
    const fetchJson = options.fetchJson || defaultFetchJson

    const homepage = await fetchPage(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepage)) {
      throw new Error('Everest official homepage changed materially')
    }

    const careersPage = await fetchPage(CAREERS_PAGE_URL)
    if (!hasOfficialCareersSignal(careersPage)) {
      throw new Error('Everest official careers page changed materially')
    }

    const verifiedBoardUrl = extractVerifiedWorkdayBoardUrl(careersPage.html)
    if (verifiedBoardUrl !== WORKDAY_BOARD_URL) {
      throw new Error('Everest verified Workday handoff changed materially')
    }

    const workdayBoardPage = await fetchPage(WORKDAY_BOARD_URL)
    if (!hasOfficialWorkdayBoardSignal(workdayBoardPage)) {
      throw new Error('Everest official Workday board changed materially')
    }

    const jobs = []
    const seenLinks = new Set()
    let offset = 0

    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const payload = await fetchJson(
        JOBS_API_URL,
        buildJobsRequestBody({ offset }),
      )

      if (!hasValidJobsPayload(payload)) {
        throw new Error('Everest Workday jobs api payload changed materially')
      }

      const postings = payload.jobPostings
      if (pageNumber === 1 && postings.length === 0) {
        return []
      }

      for (const posting of postings) {
        const summaryLocation = String(posting?.locationsText ?? '').trim() || 'Unknown'
        const isDirectIndia = isIndiaLocation(summaryLocation)
        const needsGroupedCheck = isGroupedLocationLabel(summaryLocation)

        if (!isDirectIndia && !needsGroupedCheck) {
          continue
        }

        const link = buildJobDetailUrl(posting?.externalPath)
        if (!link || seenLinks.has(link)) continue
        seenLinks.add(link)

        let detailPayload
        try {
          detailPayload = await extractDetailPayload(link, fetchPage)
        } catch {
          detailPayload = emptyDetailPayload()
        }

        if (!isDirectIndia && !detailPayload.locations.some((value) => isIndiaLocation(value))) {
          continue
        }

        const jobId = extractJobId(posting)
        const location = selectPrimaryLocation(summaryLocation, detailPayload.locations)

        jobs.push({
          jobId,
          title: posting.title,
          company: COMPANY,
          department: detailPayload.department,
          location,
          city: extractCity(location),
          locations: detailPayload.locations,
          link,
          source: SOURCE,
          postedAt: parsePostedOn(posting.postedOn),
          closingDate: null,
          jobDescription: detailPayload.jobDescription,
          minimumQualification: detailPayload.minimumQualification,
          preferredQualification: detailPayload.preferredQualification,
          requiredSkills: detailPayload.requiredSkills,
          experienceRequired: detailPayload.experienceRequired,
          requisitionId: detailPayload.requisitionId || jobId,
          scrapedAt: new Date().toISOString(),
        })
      }

      offset += postings.length
      if (!shouldContinuePagination({
        jobsCount: postings.length,
        offsetAfterPage: offset,
        payloadTotal: payload.total,
      })) {
        break
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createEverestScraper().run(options)

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
