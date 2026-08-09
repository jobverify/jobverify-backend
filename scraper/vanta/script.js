import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import VANTA_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = VANTA_CATALOG.source
export const COMPANY = VANTA_CATALOG.companyName
export const CAREERS_URL = VANTA_CATALOG.companyCareerPage
export const VERIFIED_ON = VANTA_CATALOG.verifiedOn
export const PROVIDER_METADATA = VANTA_CATALOG

const PAGINATION_PARAM = '9a22bd08_page'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtml = (value) => normalizeWhitespace(value)

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_URL).toString()
  } catch {
    return null
  }
}

const slugFromUrl = (value) => {
  try {
    const parts = new URL(value).pathname.split('/').filter(Boolean)
    return parts.at(-1) || null
  } catch {
    return null
  }
}

const inferCountry = (location) => {
  const normalized = normalizeWhitespace(location)?.toLowerCase() || ''

  if (normalized.includes('india')) return 'India'
  if (normalized.includes('u.s.') || normalized.includes('usa') || normalized.includes('united states')) {
    return 'United States'
  }
  if (normalized.includes('london') || normalized.endsWith('uk')) return 'United Kingdom'
  if (normalized.includes('dublin') || normalized.includes('ireland')) return 'Ireland'
  if (normalized.includes('sydney') || normalized.includes('australia')) return 'Australia'
  return null
}

const inferCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/^remote\b/i.test(normalized)) return 'Remote'
  return normalizeWhitespace(normalized.split(',')[0])
}

const inferRemoteStatus = (location) => (/remote/i.test(String(location ?? '')) ? 'Remote' : 'On-site')

const isExplicitIndiaLocation = (job = {}) => {
  const haystack = [
    job.location,
    job.city,
    job.country,
  ]
    .map((value) => normalizeWhitespace(value)?.toLowerCase() || '')
    .join(' ')

  return /\bindia\b/i.test(haystack)
}

const extractField = (html, pattern) => normalizeWhitespace(String(html ?? '').match(pattern)?.[1])

export const hasVerifiedCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)?.toLowerCase() || ''

  return normalized.includes('join our mission to help businesses earn and prove trust')
    && normalized.includes('open roles')
}

export const hasNoOpenPositionSignal = (html = '') =>
  /no open position found/i.test(normalizeWhitespace(html) || '')

export const extractNextPageNumber = (html = '') => {
  const match = String(html ?? '').match(
    new RegExp(`href=["'][^"']*[?&]${PAGINATION_PARAM}=(\\d+)["'][^>]*aria-label=["']Next Page["']`, 'i'),
  )

  return match ? Number.parseInt(match[1], 10) : null
}

export const extractJobsFromRenderedPageHtml = (html = '') =>
  String(html ?? '')
    .split(/<div[^>]*role=["']listitem["'][^>]*class=["'][^"']*careers-open_card[^"']*["'][^>]*>/i)
    .slice(1)
    .map((segment) => segment.split(/<div[^>]*class=["'][^"']*careers-open_card_line[^"']*["'][^>]*>/i)[0] || '')
    .map((cardHtml) => {
      const department = extractField(
        cardHtml,
        /<div[^>]*class=["'][^"']*text-color-black[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      )
      const title = extractField(
        cardHtml,
        /<div[^>]*fs-text-element=["']job-title["'][^>]*>([\s\S]*?)<\/div>/i,
      )
      const location = extractField(
        cardHtml,
        /<div[^>]*fs-cmsfilter-field=["']location["'][^>]*>([\s\S]*?)<\/div>/i,
      )
      const href = cardHtml.match(
        /<a[^>]*fs-text-element=["']job-url["'][^>]*href=["']([^"']+)["'][^>]*>/i,
      )?.[1]
      const sourceUrl = toAbsoluteUrl(href)
      const slug = slugFromUrl(sourceUrl)

      if (!title || !location || !sourceUrl || !slug) return null

      return {
        title,
        company: COMPANY,
        department,
        location,
        city: inferCity(location),
        country: inferCountry(location),
        jobId: `${SOURCE}:${slug}`,
        requisitionId: null,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
        remoteStatus: inferRemoteStatus(location),
      }
    })
    .filter(Boolean)

const buildPageUrl = (pageNumber) =>
  pageNumber > 1 ? `${CAREERS_URL}?${PAGINATION_PARAM}=${pageNumber}` : CAREERS_URL
const defaultFetchPageHtml = (pageNumber) => fetchTextWithRetry(buildPageUrl(pageNumber), {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 30000,
})

export const createVantaScraper = ({
  maxPages = 5,
} = {}) => ({
  async run({
    fetchPageHtml = defaultFetchPageHtml,
    now = () => new Date().toISOString(),
  } = {}) {
    const seenPages = new Set()
    const collectedJobs = []
    let pageNumber = 1

    while (Number.isInteger(pageNumber) && pageNumber > 0 && !seenPages.has(pageNumber)) {
      if (seenPages.size >= maxPages) {
        throw new Error('Vanta careers pagination exceeded maxPages')
      }

      seenPages.add(pageNumber)
      const html = await fetchPageHtml(pageNumber)

      if (pageNumber === 1 && !hasVerifiedCareersPageSignal(html)) {
        throw new Error('Verified Vanta careers page changed materially')
      }

      if (hasNoOpenPositionSignal(html)) {
        break
      }

      const pageJobs = extractJobsFromRenderedPageHtml(html)
      collectedJobs.push(...pageJobs)

      const nextPageNumber = extractNextPageNumber(html)
      if (!Number.isInteger(nextPageNumber)) {
        break
      }

      pageNumber = nextPageNumber
    }

    const uniqueJobs = [...new Map(collectedJobs.map((job) => [job.jobId, job])).values()]
    const indiaJobs = uniqueJobs.filter(isExplicitIndiaLocation)

    return indiaJobs.map((job) => ({
      ...job,
      jobDescription: decodeHtml(job.jobDescription),
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createVantaScraper(options).run(options)

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
