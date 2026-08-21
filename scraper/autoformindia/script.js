import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { AUTOFORM_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = AUTOFORM_INDIA_CATALOG.source
export const COMPANY_NAME = AUTOFORM_INDIA_CATALOG.companyName
export const VERIFIED_AT = AUTOFORM_INDIA_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = AUTOFORM_INDIA_CATALOG.verifiedSurfaceSummary
export const HOMEPAGE_URL = AUTOFORM_INDIA_CATALOG.homepageUrl
export const CAREERS_HOME_URL = AUTOFORM_INDIA_CATALOG.careersHomeUrl
export const JOBS_LANDING_URL = AUTOFORM_INDIA_CATALOG.jobsLandingUrl
export const JOB_SEARCH_URL = AUTOFORM_INDIA_CATALOG.companyCareerPage
export const JOBS_RSS_URL = AUTOFORM_INDIA_CATALOG.jobsRssUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const TIMEOUT_ERROR_PATTERN = /timed out|timeout|etimedout|connect timeout|und_err_connect_timeout/i

const KNOWN_FUNCTIONS = [
  'R&D',
  'Technical Services',
  'Marketing',
  'Sales',
  'Support & Corporate Services',
]

const KNOWN_CAREER_LEVELS = ['Students', 'Beginners', 'Professionals']

const escapeRegExp = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
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

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(value)
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractTagValue = (tagName, block) => {
  const match = new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)</${escapeRegExp(tagName)}>`, 'i')
    .exec(String(block ?? ''))
  return match ? match[1] : null
}

const extractTagValues = (tagName, block) => [...String(block ?? '').matchAll(
  new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)</${escapeRegExp(tagName)}>`, 'gi'),
)].map((match) => normalizeWhitespace(match[1])).filter(Boolean)

const normalizeUrl = (value, baseUrl = JOBS_LANDING_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return normalized
  }
}

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const slugFromUrl = (value) => {
  try {
    return new URL(value || JOBS_RSS_URL).pathname.split('/').filter(Boolean).at(-1) || null
  } catch {
    return null
  }
}

const sameText = (left, right) => String(left ?? '').toLowerCase() === String(right ?? '').toLowerCase()

const isConnectTimeoutError = (error) => {
  const causeCode = String(error?.cause?.code ?? '')
  const causeMessage = String(error?.cause?.message ?? '')
  const message = String(error?.message ?? error ?? '')

  return /UND_ERR_CONNECT_TIMEOUT|ETIMEDOUT/i.test(causeCode)
    || TIMEOUT_ERROR_PATTERN.test(causeMessage)
    || TIMEOUT_ERROR_PATTERN.test(message)
}

const fetchSurfaceText = async (fetchText, url) => {
  try {
    return {
      timedOut: false,
      text: await fetchText(url),
    }
  } catch (error) {
    if (isConnectTimeoutError(error)) {
      return {
        timedOut: true,
        text: null,
      }
    }

    throw error
  }
}

export const extractLocationOptions = (html) => {
  const selectHtml = String(html ?? '').match(
    /<select\b[^>]+name=["'][^"']*location[^"']*["'][^>]*>([\s\S]*?)<\/select>/i,
  )?.[1] ?? ''

  return [...selectHtml.matchAll(/<option\b[^>]*value=["']([^"']*)["'][^>]*>([\s\S]*?)<\/option>/gi)]
    .map((match) => ({
      value: normalizeWhitespace(match[1]) ?? '',
      label: normalizeWhitespace(match[2]),
    }))
    .filter((option) => option.label)
}

const hasIndiaLocationOption = (html) => extractLocationOptions(html)
  .some((option) => option.value === '976' && sameText(option.label, 'India'))

const hasIndiaLocationFilterSignal = (html) => {
  const normalized = normalizeWhitespace(html) || ''
  return hasIndiaLocationOption(html)
    || /Asia\s*&\s*Pacific\b[\s\S]*\bIndia\b/i.test(normalized)
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml) || ''

  return /<title>\s*Software Solutions for Sheet Metal Forming and BiW Assembly \| AutoForm Engineering\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.autoform\.com\/en\/["']/i.test(rawHtml)
    && /href=["']https:\/\/careers\.autoform\.com\/en\/["']/i.test(rawHtml)
    && /Your ideas will matter\./i.test(normalized)
    && /Visit our career website/i.test(normalized)
}

export const hasOfficialCareersHomeSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml) || ''

  return /<title>\s*careers\.autoform\.com\s*<\/title>/i.test(rawHtml)
    && /Your ideas will matter\./i.test(normalized)
    && /Join a winning team\./i.test(normalized)
    && /We are AutoForm/i.test(normalized)
    && /Join our great team now\. Browse our job offerings\./i.test(normalized)
    && /href=["'](?:https:\/\/careers\.autoform\.com)?\/en\/jobs\/(?:job-search\/)?["']/i.test(rawHtml)
}

export const hasOfficialJobSearchSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml) || ''

  return /<title>\s*Job search\s*<\/title>/i.test(rawHtml)
    && hasIndiaLocationFilterSignal(rawHtml)
    && /\bR&D\b/i.test(normalized)
    && /Technical Services/i.test(normalized)
    && /Marketing/i.test(normalized)
    && /Sales/i.test(normalized)
    && /Support & Corporate Services/i.test(normalized)
    && /Students/i.test(normalized)
    && /Beginners/i.test(normalized)
    && /Professionals/i.test(normalized)
    && (
      /\/en\/jobs\/job-search\/advertisement\//i.test(rawHtml)
      || /A speculative application is always a good idea/i.test(normalized)
    )
}

export const hasOfficialJobsRssSignal = (xml) => {
  const rawXml = String(xml ?? '')

  return /<rss\b/i.test(rawXml)
    && /<title>\s*careers\.autoform\s*<\/title>/i.test(rawXml)
    && new RegExp(`<atom:link[^>]+href=["']${escapeRegExp(JOBS_RSS_URL)}["']`, 'i').test(rawXml)
    && /<generator>\s*TYPO3 EXT:news\s*<\/generator>/i.test(rawXml)
    && /https:\/\/careers\.autoform\.com\/en\/jobs\/job-search\/advertisement\//i.test(rawXml)
}

export const extractRssItems = (xml) => [...String(xml ?? '').matchAll(/<item>([\s\S]*?)<\/item>/gi)]
  .map((match) => match[1])
  .map((block) => ({
    title: normalizeWhitespace(extractTagValue('title', block)),
    sourceUrl: normalizeUrl(extractTagValue('link', block)),
    postingDate: normalizeDate(extractTagValue('pubDate', block)),
    categories: extractTagValues('category', block),
    description: stripTags(
      extractTagValue('content:encoded', block) || extractTagValue('description', block),
    ),
  }))
  .filter((item) => item.title && item.sourceUrl)

const isIndiaRssItem = (item = {}) => {
  const categories = Array.isArray(item.categories) ? item.categories : []
  if (categories.some((category) => sameText(category, 'India'))) return true
  return /\bindia\b/i.test(String(item.description ?? ''))
}

const findDepartment = (categories = []) => categories.find((category) =>
  KNOWN_FUNCTIONS.some((department) => sameText(category, department))) || null

const findCity = (categories = []) => categories.find((category) =>
  !sameText(category, 'India')
  && !KNOWN_FUNCTIONS.some((department) => sameText(category, department))
  && !KNOWN_CAREER_LEVELS.some((level) => sameText(category, level))) || null

const buildJobFromRssItem = (item = {}) => {
  if (!isIndiaRssItem(item)) return null

  const city = findCity(item.categories)
  const department = findDepartment(item.categories)
  const jobId = slugify(slugFromUrl(item.sourceUrl) || item.title)

  if (!jobId) return null

  return {
    title: item.title,
    company: COMPANY_NAME,
    department,
    location: city ? `${city}, India` : 'India',
    city,
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: item.sourceUrl,
    applyUrl: item.sourceUrl,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: item.postingDate,
    closingDate: null,
    jobDescription: item.description,
  }
}

export const extractIndiaJobsFromFeed = (xml) => extractRssItems(xml)
  .map((item) => buildJobFromRssItem(item))
  .filter(Boolean)

const normalizeScrapedAt = (value) => {
  if (value instanceof Date) return value.toISOString()

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid now() value supplied to AutoForm India scraper')
  }

  return parsed.toISOString()
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml,text/xml;q=0.8,*/*;q=0.7',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createAutoFormIndiaScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepage = await fetchSurfaceText(fetchText, HOMEPAGE_URL)
    if (homepage.timedOut) {
      const careersHome = await fetchSurfaceText(fetchText, CAREERS_HOME_URL)
      const jobSearch = await fetchSurfaceText(fetchText, JOB_SEARCH_URL)
      const rssFeed = await fetchSurfaceText(fetchText, JOBS_RSS_URL)

      if (careersHome.timedOut && jobSearch.timedOut && rssFeed.timedOut) {
        return []
      }

      throw new Error('AutoForm India verified first-party timeout contract changed materially')
    }

    const homepageHtml = homepage.text
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('AutoForm India verified official homepage no longer matches the known public surface')
    }

    const careersHome = await fetchSurfaceText(fetchText, CAREERS_HOME_URL)
    if (careersHome.timedOut) {
      throw new Error('AutoForm India verified first-party timeout contract changed materially')
    }

    const careersHomeHtml = careersHome.text
    if (!hasOfficialCareersHomeSignal(careersHomeHtml)) {
      throw new Error('AutoForm India verified first-party careers home no longer matches the known public surface')
    }

    const jobSearch = await fetchSurfaceText(fetchText, JOB_SEARCH_URL)
    if (jobSearch.timedOut) {
      throw new Error('AutoForm India verified first-party timeout contract changed materially')
    }

    const jobSearchHtml = jobSearch.text
    if (!hasOfficialJobSearchSignal(jobSearchHtml)) {
      throw new Error('AutoForm India verified job search page no longer matches the known public surface')
    }

    const rssFeed = await fetchSurfaceText(fetchText, JOBS_RSS_URL)
    if (rssFeed.timedOut) {
      throw new Error('AutoForm India verified first-party timeout contract changed materially')
    }

    const rssFeedXml = rssFeed.text
    if (!hasOfficialJobsRssSignal(rssFeedXml)) {
      throw new Error('AutoForm India verified jobs RSS feed no longer matches the known public surface')
    }

    const scrapedAt = normalizeScrapedAt(now())

    return extractIndiaJobsFromFeed(rssFeedXml).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createAutoFormIndiaScraper().run(options)

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
