import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'amperecomputing'
export const COMPANY = 'Ampere Computing'
export const CAREER_PAGE_URL = 'https://careers.amperecomputing.com/'
export const SEARCH_URL = 'https://careers.amperecomputing.com/search/jobs'
export const INDIA_SEARCH_URL = 'https://careers.amperecomputing.com/search/jobs/in/country/india'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '').replace(/<[^>]+>/g, ' '),
)

const getPageHtml = (page = {}) => String(page.html ?? page.body ?? page.text ?? '')

const getHeader = (page = {}, name) => {
  const normalizedName = String(name ?? '').toLowerCase()
  const headers = page?.headers
  if (!headers) return ''
  if (typeof headers.get === 'function') {
    return String(headers.get(normalizedName) || headers.get(name) || '')
  }
  return String(headers[normalizedName] || headers[name] || '')
}

const parseLocation = (value) => {
  const location = normalizeWhitespace(value)
  const parts = location?.split(',').map(normalizeWhitespace).filter(Boolean) || []
  return {
    location,
    city: parts[0] || null,
    country: parts.at(-1) || null,
  }
}

const extractLabeledText = (html, className) => stripTags(
  html.match(new RegExp(`<[^>]+class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/`, 'i'))?.[1],
)

const HAS_JOB_DETAIL_LINK_PATTERN = /href=["'][^"']*(?:\/jobs\/\d+-[^"']+)["']/i

export const extractSearchResults = (html) => {
  const page = String(html ?? '')
  const results = []
  const cards = page.match(/<(?:div|li)[^>]+class=["'][^"']*(?:job-card|job-listing|job-search-result)[^"']*["'][^>]*>[\s\S]*?<\/(?:div|li)>/gi) || []

  for (const card of cards) {
    const match = card.match(/href=["'](\/jobs\/(\d+)-[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)
    if (!match) continue

    const [, pathName, jobId, rawTitle] = match
    const location = extractLabeledText(card, 'job-location')
    if (!location || !/\bIndia\s*$/i.test(location)) continue

    results.push({
      title: stripTags(rawTitle),
      category: extractLabeledText(card, 'job-category'),
      location,
      jobId,
      sourceUrl: new URL(pathName, SEARCH_URL).toString(),
    })
  }

  if (results.length > 0) return results

  const seen = new Set()
  for (const match of page.matchAll(/<h3[^>]*class=["'][^"']*heading-6[^"']*["'][^>]*>\s*<a[^>]+href=["']([^"']*\/jobs\/(\d+)-[^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h3>/gi)) {
    const [, pathName, jobId, rawTitle] = match
    const resultWindow = page.slice(match.index, match.index + 1600)
    const columns = [...resultWindow.matchAll(/<div[^>]*class=["'][^"']*large-3 columns[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi)]
      .map((columnMatch) => stripTags(columnMatch[1]))
      .map((value) => value?.replace(/^(Category|Location):\s*/i, '').trim() || null)
      .filter(Boolean)
    const location = columns.find((value) => /\bIndia\s*$/i.test(value)) || null
    if (!location) continue

    const sourceUrl = new URL(pathName, SEARCH_URL).toString()
    if (seen.has(sourceUrl)) continue
    seen.add(sourceUrl)

    results.push({
      title: stripTags(rawTitle),
      category: columns[0] || null,
      location,
      jobId,
      sourceUrl,
    })
  }

  return results
}

export const hasOfficialSearchResultsSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page) || ''
  const extractedListings = extractSearchResults(page)

  const hasStructuredSearchChrome = (
    /<title>\s*(?:Job Search Results|India Careers)\s*<\/title>/i.test(page)
    || text.includes('Job Search Results')
    || text.includes('India Careers')
  ) && /Showing\s+\d+\s*-\s*\d+\s+of\s+\d+\s+results/i.test(text)
    && /\bJob Title\b/i.test(text)
    && /\bCategory\b/i.test(text)
    && /\bLocation\b/i.test(text)

  const hasLegacyVerifiedListings = extractedListings.length > 0
    && HAS_JOB_DETAIL_LINK_PATTERN.test(page)

  return (hasStructuredSearchChrome && (HAS_JOB_DETAIL_LINK_PATTERN.test(page) || /\b0\s+results\b/i.test(text)))
    || hasLegacyVerifiedListings
}

const extractJsonLd = (html) => {
  const raw = String(html ?? '').match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)?.[1]
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.find((entry) => entry?.['@type'] === 'JobPosting') : parsed
  } catch {
    return null
  }
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized.includes('full')) return 'Full-time'
  if (normalized.includes('part')) return 'Part-time'
  if (normalized.includes('contract')) return 'Contract'
  if (normalized.includes('intern')) return 'Internship'
  return normalizeWhitespace(value)
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
      Referer: CAREER_PAGE_URL,
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  })

  return {
    status: response.status,
    url: response.url || url,
    headers: Object.fromEntries(response.headers.entries()),
    html: await response.text(),
  }
}

export const hasVerifiedCloudflareChallengeSignal = (page = {}) => {
  const html = getPageHtml(page)
  const text = normalizeWhitespace(html) || ''

  return Number(page.status) === 403
    && /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(html)
    && /challenges\.cloudflare\.com/i.test(html)
    && text.includes('Enable JavaScript and cookies to continue')
}

export const isVerifiedCloudflareChallengedPage = (page = {}, expectedUrl) => {
  const finalUrl = String(page.url || expectedUrl)

  return finalUrl === expectedUrl
    && /cloudflare/i.test(getHeader(page, 'server'))
    && getHeader(page, 'cf-ray').trim().length > 0
    && getHeader(page, 'cf-mitigated').toLowerCase() === 'challenge'
    && hasVerifiedCloudflareChallengeSignal(page)
}

const createFetchPageFromText = (fetchText) => async (url) => ({
  status: 200,
  url,
  headers: {},
  html: await fetchText(url),
})

const buildJobRecord = (listing, detail, now) => {
  const parsedLocation = parseLocation(
    detail.jobLocation?.address
      ? [
          detail.jobLocation.address.addressLocality,
          detail.jobLocation.address.addressRegion,
          detail.jobLocation.address.addressCountry,
        ].filter(Boolean).join(', ')
      : listing.location,
  )

  return {
    title: normalizeWhitespace(detail.title) || listing.title,
    company: COMPANY,
    location: parsedLocation.location,
    city: parsedLocation.city,
    country: parsedLocation.country,
    link: listing.sourceUrl,
    applyUrl: listing.sourceUrl,
    sourceUrl: listing.sourceUrl,
    source: SOURCE,
    jobId: listing.jobId,
    requisitionId: listing.jobId,
    department: listing.category,
    employmentType: normalizeEmploymentType(detail.employmentType),
    experienceRequired: null,
    postingDate: normalizeWhitespace(detail.datePosted),
    closingDate: normalizeWhitespace(detail.validThrough),
    jobDescription: stripTags(detail.description),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    remoteStatus: 'On-site',
    scrapedAt: now(),
  }
}

const hydrateListings = async (listings, { fetchPage, now }) => {
  const jobs = []

  for (const listing of listings) {
    const detailPage = await fetchPage(listing.sourceUrl)
    if (isVerifiedCloudflareChallengedPage(detailPage, listing.sourceUrl)) {
      throw new Error('Ampere Computing job detail page no longer matches the verified first-party contract')
    }

    const detail = extractJsonLd(getPageHtml(detailPage)) || {}
    jobs.push(buildJobRecord(listing, detail, now))
  }

  return jobs
}

export const createAmpereComputingScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchPage, fetchText } = {}) {
    const effectiveFetchPage = typeof fetchPage === 'function'
      ? fetchPage
      : typeof fetchText === 'function'
        ? createFetchPageFromText(fetchText)
        : defaultFetchPage

    const searchPage = await effectiveFetchPage(SEARCH_URL)
    const searchHtml = getPageHtml(searchPage)

    if (isVerifiedCloudflareChallengedPage(searchPage, SEARCH_URL)) {
      const indiaSearchPage = await effectiveFetchPage(INDIA_SEARCH_URL)
      if (isVerifiedCloudflareChallengedPage(indiaSearchPage, INDIA_SEARCH_URL)) {
        return []
      }

      const indiaSearchHtml = getPageHtml(indiaSearchPage)
      if (!hasOfficialSearchResultsSignal(indiaSearchHtml)) {
        throw new Error('Ampere Computing India search route no longer matches the verified first-party jobs surface')
      }

      return hydrateListings(extractSearchResults(indiaSearchHtml), {
        fetchPage: effectiveFetchPage,
        now,
      })
    }

    if (!hasOfficialSearchResultsSignal(searchHtml)) {
      throw new Error('Ampere Computing search results page no longer matches the verified first-party surface')
    }

    let listings = extractSearchResults(searchHtml)
    if (listings.length === 0) {
      const indiaSearchPage = await effectiveFetchPage(INDIA_SEARCH_URL)
      if (isVerifiedCloudflareChallengedPage(indiaSearchPage, INDIA_SEARCH_URL)) {
        return []
      }

      const indiaSearchHtml = getPageHtml(indiaSearchPage)
      if (!hasOfficialSearchResultsSignal(indiaSearchHtml)) {
        throw new Error('Ampere Computing India search route no longer matches the verified first-party jobs surface')
      }

      listings = extractSearchResults(indiaSearchHtml)
    }

    return hydrateListings(listings, {
      fetchPage: effectiveFetchPage,
      now,
    })
  },
})

export const run = async (options = {}) => createAmpereComputingScraper().run(options)

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
