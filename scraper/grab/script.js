import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { GRAB_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const JOBS_URL = PROVIDER_METADATA.companyCareerPage
export const INDIA_LOCATION_URL = PROVIDER_METADATA.indiaLocationPageUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const htmlToText = (value) =>
  decodeHtmlEntities(
    String(value ?? '')
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<(br|\/p|\/div|\/section|\/article|\/main|\/li|\/ul|\/ol|\/h[1-6])\b[^>]*>/gi, '\n')
      .replace(/<(p|div|section|article|main|li|ul|ol|h[1-6])\b[^>]*>/gi, '\n')
      .replace(/<\/a>/gi, '')
      .replace(/<a\b[^>]*>/gi, '')
      .replace(/<[^>]+>/g, ' '),
  )

const stripTags = (value) => normalizeWhitespace(htmlToText(value))

const makeAbsoluteUrl = (value, baseUrl) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const extractJobIdFromUrl = (value) => {
  const match = String(value ?? '').match(/\/jobs\/(\d+)\//i)
  return match?.[1] || null
}

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalized.split(',')[0]?.trim() || normalized
}

const isIndiaLocation = (location) => /\bindia\b/i.test(location || '')

const extractListingCards = (html = '', baseUrl) => {
  const cards = []
  const seenDetailUrls = new Set()
  const page = String(html ?? '')

  for (const match of page.matchAll(/<a\b[^>]*href=["']([^"']*\/jobs\/\d+\/[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = normalizeWhitespace(match[1])
    const detailUrl = makeAbsoluteUrl(href, baseUrl)
    const title = normalizeWhitespace(stripTags(match[2]))

    if (!title || !detailUrl || seenDetailUrls.has(detailUrl)) continue

    const anchorOffset = Number(match.index) + String(match[0]).length
    const trailingHtml = page.slice(anchorOffset, anchorOffset + 2500)
    const listHtml = trailingHtml.match(
      /<ul\b[^>]*class=["'][^"']*\bjob-meta\b[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i,
    )?.[1]
      || trailingHtml.match(/<ul\b[^>]*>([\s\S]*?)<\/ul>/i)?.[1]

    const listItems = [...String(listHtml ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((item) => normalizeWhitespace(stripTags(item[1])))
      .filter(Boolean)

    if (listItems.length < 2) continue

    seenDetailUrls.add(detailUrl)

    cards.push({
      title,
      detailUrl,
      location: listItems[0],
      department: listItems[1],
    })
  }

  return cards
}

const toNormalizedJob = (card, { scrapedAt }) => {
  const jobId = extractJobIdFromUrl(card.detailUrl)
  if (!jobId) return null

  return {
    title: card.title,
    company: COMPANY,
    department: card.department,
    location: card.location,
    city: extractCity(card.location),
    country: 'India',
    link: card.detailUrl,
    applyUrl: card.detailUrl,
    sourceUrl: card.detailUrl,
    source: SOURCE,
    jobId,
    requisitionId: jobId,
    employmentType: null,
    experienceRequired: null,
    jobDescription: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    remoteStatus: null,
    scrapedAt,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialJobsBoardSignal = (html = '') => {
  const text = (stripTags(html) || '').toLowerCase()

  return text.includes('grab your dream role')
    && text.includes('search jobs')
    && text.includes('displaying 1 to 20 of')
    && text.includes('matching jobs')
    && text.includes('location cambodia china india indonesia malaysia philippines romania singapore thailand vietnam')
}

export const hasOfficialIndiaLocationSignal = (html = '') => {
  const text = (stripTags(html) || '').toLowerCase()

  return text.includes('welcome to india!')
    && text.includes('join our team in india')
    && text.includes('see all jobs')
    && text.includes('bangalore')
}

export const extractJobsFromJobsBoardHtml = (
  html,
  {
    scrapedAt = new Date().toISOString(),
  } = {},
) => extractListingCards(html, HOMEPAGE_URL)
  .filter((card) => isIndiaLocation(card.location))
  .map((card) => toNormalizedJob(card, { scrapedAt }))
  .filter(Boolean)

export const extractJobsFromIndiaLocationHtml = (
  html,
  {
    scrapedAt = new Date().toISOString(),
  } = {},
) => extractListingCards(html, HOMEPAGE_URL)
  .filter((card) => isIndiaLocation(card.location))
  .map((card) => toNormalizedJob(card, { scrapedAt }))
  .filter(Boolean)

export const mergeJobs = (...jobCollections) => {
  const merged = new Map()

  for (const collection of jobCollections) {
    for (const job of collection) {
      if (!job?.sourceUrl) continue
      if (!merged.has(job.sourceUrl)) {
        merged.set(job.sourceUrl, job)
      }
    }
  }

  return [...merged.values()]
}

export const createGrabScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const jobsBoardHtml = await fetchText(JOBS_URL)
    if (!hasOfficialJobsBoardSignal(jobsBoardHtml)) {
      throw new Error('Grab verified Grab jobs board no longer matches the official first-party surface')
    }

    const indiaLocationHtml = await fetchText(INDIA_LOCATION_URL)
    if (!hasOfficialIndiaLocationSignal(indiaLocationHtml)) {
      throw new Error('Grab verified Grab India location page no longer matches the official first-party surface')
    }

    const scrapedAt = now()
    const jobs = mergeJobs(
      extractJobsFromJobsBoardHtml(jobsBoardHtml, { scrapedAt }),
      extractJobsFromIndiaLocationHtml(indiaLocationHtml, { scrapedAt }),
    ).map((job) => ({
      ...job,
      companyCareerPage: JOBS_URL,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
    }))

    if (jobs.length === 0) {
      throw new Error('Grab verified first-party surfaces no longer exposes normalized india jobs')
    }

    return jobs
  },
})

export const run = async (options = {}) => createGrabScraper(options).run(options)

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
