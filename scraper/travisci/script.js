import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import { TRAVISCI_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = TRAVISCI_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const ABOUT_PAGE_URL = PROVIDER_METADATA.aboutPageUrl
export const IMPRINT_PAGE_URL = PROVIDER_METADATA.imprintPageUrl
export const WORKABLE_BOARD_URL = PROVIDER_METADATA.workableBoardUrl
export const JOBS_FEED_URL = PROVIDER_METADATA.jobsFeedUrl
export const WIDGET_API_URL = PROVIDER_METADATA.widgetApiUrl
export const NO_PUBLIC_JOB_ROUTE_URLS = [...PROVIDER_METADATA.noPublicJobRouteUrls]
export const COUNTRY_FILTER = PROVIDER_METADATA.countryFilter
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeUrl = (value) => String(value ?? '').replace(/\/+$/, '')

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;|&#038;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/\r/g, '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeOptionalValue = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized || /^-+$/.test(normalized)) return null
  return normalized
}

const getFinalUrl = (page, fallbackUrl) => page?.url || page?.finalUrl || fallbackUrl

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

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/markdown,text/plain;q=0.9,*/*;q=0.8',
  },
  label: 'travisci workable jobs feed',
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
  },
  label: 'travisci workable widget payload',
  timeoutMs: 15000,
})

export const hasOfficialHomepageSignal = (page) => {
  const html = typeof page === 'string' ? page : page?.html
  const status = typeof page === 'string' ? 200 : Number(page?.status)
  const finalUrl = normalizeUrl(getFinalUrl(page, HOMEPAGE_URL))
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return status === 200
    && finalUrl === normalizeUrl(HOMEPAGE_URL)
    && /<title[^>]*>\s*Simple,\s*Flexible,\s*Trustworthy CI\/CD Tools\s*-\s*Travis CI\s*<\/title>/i.test(rawHtml)
    && normalized.includes('How developers build simple, trustworthy CI/CD pipelines')
    && normalized.includes('Where developers trust Travis CI with testing and automation')
}

export const hasAboutPageSignal = (page) => {
  const html = typeof page === 'string' ? page : page?.html
  const status = typeof page === 'string' ? 200 : Number(page?.status)
  const finalUrl = normalizeUrl(getFinalUrl(page, ABOUT_PAGE_URL))
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return status === 200
    && finalUrl === normalizeUrl(ABOUT_PAGE_URL)
    && /<title[^>]*>\s*Empowering Developers Worldwide Since 2011\s*-\s*Travis CI\s*<\/title>/i.test(rawHtml)
    && normalized.includes('Founded in Berlin, Germany, in 2011')
    && normalized.includes('In 2019, Travis CI became part of Idera, Inc.')
}

export const hasImprintSignal = (page) => {
  const html = typeof page === 'string' ? page : page?.html
  const status = typeof page === 'string' ? 200 : Number(page?.status)
  const finalUrl = normalizeUrl(getFinalUrl(page, IMPRINT_PAGE_URL))
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return status === 200
    && finalUrl === normalizeUrl(IMPRINT_PAGE_URL)
    && /<title[^>]*>\s*Imprint\s*-\s*Travis CI\s*<\/title>/i.test(rawHtml)
    && normalized.includes('Travis CI GmbH')
    && normalized.includes('51379 Leverkusen')
    && normalized.includes('Work with Travis CI')
    && rawHtml.includes(WORKABLE_BOARD_URL)
}

export const hasVerifiedMissingJobRoute = (page, expectedUrl) => {
  const status = Number(page?.status)
  const finalUrl = normalizeUrl(getFinalUrl(page, expectedUrl))
  const rawHtml = String(page?.html ?? '')

  return status === 404
    && finalUrl === normalizeUrl(expectedUrl)
    && /<title[^>]*>\s*Page not found\s*-\s*Travis CI\s*<\/title>/i.test(rawHtml)
}

export const hasWorkableBoardSignal = (page) => {
  const html = typeof page === 'string' ? page : page?.html
  const status = typeof page === 'string' ? 200 : Number(page?.status)
  const finalUrl = normalizeUrl(getFinalUrl(page, WORKABLE_BOARD_URL))
  const rawHtml = String(html ?? '')

  return status === 200
    && finalUrl === normalizeUrl(WORKABLE_BOARD_URL)
    && /<title[^>]*>\s*Travis CI\s*-\s*Current Openings\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/apply\.workable\.com\/travisci\/["']/i.test(rawHtml)
    && /<meta[^>]+name=["']subdomain["'][^>]+content=["']travisci["']/i.test(rawHtml)
    && /window\.careers\s*=/i.test(rawHtml)
}

export const hasOfficialJobsFeedSignal = (markdown) => {
  const value = String(markdown ?? '')

  return /^#\s*Travis CI\s*[—-]\s*All Open Positions/im.test(value)
    && /^>\s*Last updated:/im.test(value)
    && /^\|\s*Title\s*\|\s*Department\s*\|\s*Location\s*\|\s*Type\s*\|\s*Salary\s*\|\s*Posted\s*\|\s*Details\s*\|/im.test(value)
    && /Powered by\s+\[Workable\]\(https:\/\/www\.workable\.com\)/i.test(value)
}

const parseWidgetPayload = (payload) => {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload)
    } catch {
      return null
    }
  }

  return payload ?? null
}

export const hasWidgetApiSignal = (payload) => {
  const parsed = parseWidgetPayload(payload)

  return normalizeWhitespace(parsed?.name).toLowerCase() === 'travis ci'
    && normalizeWhitespace(parsed?.description).includes('continuous integration and delivery platform')
    && Array.isArray(parsed?.jobs)
}

const splitMarkdownRow = (line) => {
  const cells = []
  let current = ''
  let escaping = false

  for (const char of String(line ?? '')) {
    if (escaping) {
      current += char
      escaping = false
      continue
    }

    if (char === '\\') {
      escaping = true
      continue
    }

    if (char === '|') {
      cells.push(current)
      current = ''
      continue
    }

    current += char
  }

  if (escaping) current += '\\'
  cells.push(current)

  if (cells[0]?.trim() === '') cells.shift()
  if (cells.at(-1)?.trim() === '') cells.pop()

  return cells.map((cell) => normalizeWhitespace(cell))
}

const extractMarkdownLink = (value) => {
  const match = String(value ?? '').match(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/i)
  if (match?.[1]) return match[1]

  const fallback = String(value ?? '').match(/https?:\/\/\S+/i)
  return fallback?.[0] || null
}

const stripTrailingWorkMode = (value) => normalizeWhitespace(value).replace(/\s+\(([^)]+)\)\s*$/, '')

const parseLocation = (value) => {
  const location = normalizeOptionalValue(value)
  const cleanLocation = location ? stripTrailingWorkMode(location) : null
  const parts = cleanLocation
    ? cleanLocation.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean)
    : []

  return {
    location,
    city: parts[0] || null,
    state: parts.length >= 3 ? parts[1] : null,
    country: parts.at(-1) || null,
  }
}

const isIndiaLocation = (value) => /(^|[\s,(])india($|[\s,).])/i.test(String(value ?? ''))

export const extractJobIdFromDetailsUrl = (value) => {
  const viewMatch = String(value ?? '').match(/\/jobs\/view\/([A-Z0-9]+)(?:\.md)?$/i)
  if (viewMatch?.[1]) return viewMatch[1].toUpperCase()

  const publicMatch = String(value ?? '').match(/\/j\/([A-Z0-9]+)\/?(?:apply)?$/i)
  return publicMatch?.[1]?.toUpperCase() || null
}

const buildJobUrl = (jobId) => `${WORKABLE_BOARD_URL}j/${jobId}/`
const buildApplyUrl = (jobId) => `${WORKABLE_BOARD_URL}j/${jobId}/apply`

const normalizeEmploymentType = (value) => {
  const normalized = normalizeOptionalValue(value)
  if (!normalized) return null
  if (/full[\s-]?time/i.test(normalized)) return 'Full-time'
  if (/part[\s-]?time/i.test(normalized)) return 'Part-time'
  if (/intern/i.test(normalized)) return 'Internship'
  if (/contract/i.test(normalized)) return 'Contract'
  return normalized
}

const normalizePostingDate = (value) => normalizeOptionalValue(value) || null

export const extractJobsFromMarkdown = (markdown) => {
  const jobs = []
  const seenJobIds = new Set()

  for (const line of String(markdown ?? '').split(/\r?\n/)) {
    const trimmedLine = line.trim()
    if (!trimmedLine.startsWith('|')) continue
    if (/^\|\s*Title\s*\|/i.test(trimmedLine)) continue
    if (/^\|\s*:?-{2,}/.test(trimmedLine)) continue

    const cells = splitMarkdownRow(trimmedLine)
    if (cells.length < 7) continue

    const detailsCell = cells.at(-1)
    const postedCell = cells.at(-2)
    const typeCell = cells.at(-4)
    const locationCell = cells.at(-5)
    const departmentCell = cells.at(-6)
    const titleCell = cells.slice(0, -6).join(' | ')
    const detailsUrl = extractMarkdownLink(detailsCell)
    const jobId = extractJobIdFromDetailsUrl(detailsUrl)
    const locationBits = parseLocation(locationCell)

    if (!titleCell || !detailsUrl || !jobId || !isIndiaLocation(locationBits.location)) continue
    if (seenJobIds.has(jobId)) continue

    seenJobIds.add(jobId)
    jobs.push({
      title: normalizeWhitespace(titleCell),
      company: COMPANY,
      department: normalizeOptionalValue(departmentCell),
      location: locationBits.location,
      city: locationBits.city,
      state: locationBits.state,
      country: locationBits.country,
      jobId,
      requisitionId: jobId,
      sourceUrl: buildJobUrl(jobId),
      applyUrl: buildApplyUrl(jobId),
      employmentType: normalizeEmploymentType(typeCell),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizePostingDate(postedCell),
      closingDate: null,
      jobDescription: null,
    })
  }

  return jobs
}

const normalizeScrapedAt = (value) => {
  if (value instanceof Date) return value.toISOString()

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid now() value supplied to Travis CI scraper')
  }

  return parsed.toISOString()
}

export const createTravisCiScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date(),
} = {}) => ({
  async run(options = {}) {
    const fetchPage = options.fetchPage || defaultFetchPage
    const fetchText = options.fetchText || defaultFetchText
    const fetchJson = options.fetchJson || defaultFetchJson

    const homepagePage = await fetchPage(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepagePage)) {
      throw new Error('Travis CI verified official homepage no longer matches the trusted public surface')
    }

    const aboutPage = await fetchPage(ABOUT_PAGE_URL)
    if (!hasAboutPageSignal(aboutPage)) {
      throw new Error('Travis CI verified about page no longer matches the trusted public surface')
    }

    const imprintPage = await fetchPage(IMPRINT_PAGE_URL)
    if (!hasImprintSignal(imprintPage)) {
      throw new Error('Travis CI verified imprint handoff no longer matches the trusted public surface')
    }

    for (const url of NO_PUBLIC_JOB_ROUTE_URLS) {
      const page = await fetchPage(url)
      if (!hasVerifiedMissingJobRoute(page, url)) {
        throw new Error(`Travis CI verified main-domain missing careers route changed materially: ${url}`)
      }
    }

    const workableBoardPage = await fetchPage(WORKABLE_BOARD_URL)
    if (!hasWorkableBoardSignal(workableBoardPage)) {
      throw new Error('Travis CI verified Workable board no longer matches the trusted public surface')
    }

    const jobsMarkdown = await fetchText(JOBS_FEED_URL)
    if (!hasOfficialJobsFeedSignal(jobsMarkdown)) {
      throw new Error('Travis CI verified Workable jobs feed no longer matches the trusted public surface')
    }

    const widgetPayload = await fetchJson(WIDGET_API_URL)
    if (!hasWidgetApiSignal(widgetPayload)) {
      throw new Error('Travis CI verified Workable widget payload no longer matches the trusted public surface')
    }

    const limit = Number.isInteger(options.maxJobs) ? options.maxJobs : maxJobs
    const jobs = extractJobsFromMarkdown(jobsMarkdown)
    const selectedJobs = limit ? jobs.slice(0, limit) : jobs
    const scrapedAt = normalizeScrapedAt((options.now || now)())

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createTravisCiScraper().run(options)

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
