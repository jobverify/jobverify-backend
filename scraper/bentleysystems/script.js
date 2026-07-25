import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BENTLEY_SYSTEMS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = BENTLEY_SYSTEMS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_HOST_URL = PROVIDER_METADATA.officialJobsHostUrl
export const INDIA_SEARCH_URL = PROVIDER_METADATA.indiaSearchUrl
export const SAMPLE_JOB_URL = PROVIDER_METADATA.sampleJobUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, '\'')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value, baseUrl) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const toIsoDate = (value) => {
  const normalized = normalizeWhitespace(value)
  const timestamp = normalized ? Date.parse(normalized) : Number.NaN
  if (Number.isNaN(timestamp)) return normalized
  return new Date(timestamp).toISOString().slice(0, 10)
}

const extractJobIdFromUrl = (value) => {
  const match = String(value ?? '').match(/\/(\d+)\/?$/)
  return match ? match[1] : null
}

export const hasOfficialJobsHostSignal = (html = '') => {
  const page = String(html ?? '')
  return /<title>\s*Careers \| Bentley Systems/i.test(page)
    && /https:\/\/www\.bentley\.com\/company\/careers\//i.test(page)
    && /https:\/\/jobs\.bentley\.com\/search\/\?searchby=location&amp;q=&amp;locationsearch=&amp;geolocation=/i.test(page)
}

export const hasIndiaSearchResultsSignal = (html = '') => {
  const page = String(html ?? '')
  return /locationsearch=India/i.test(page)
    && /class="data-row"/i.test(page)
    && /href="\/job\//i.test(page)
}

export const extractSearchResults = (html = '') => {
  const results = []
  const seenUrls = new Set()

  for (const match of String(html ?? '').matchAll(
    /<tr class="data-row">([\s\S]*?)<\/tr>/gi,
  )) {
    const rowHtml = match[1]
    const relativeUrl = rowHtml.match(/<a[^>]+href="([^"]+)"[^>]*class="jobTitle-link"[^>]*>([\s\S]*?)<\/a>/i)?.[1]
    const sourceUrl = toAbsoluteUrl(relativeUrl, JOBS_HOST_URL)
    const title = stripTags(rowHtml.match(/class="jobTitle-link"[^>]*>([\s\S]*?)<\/a>/i)?.[1] || '')
    const location = stripTags(rowHtml.match(/<span class="jobLocation">([\s\S]*?)<\/span>/i)?.[1] || '')
    const postingDate = stripTags(rowHtml.match(/<span class="jobDate">([\s\S]*?)<\/span>/i)?.[1] || '')

    if (!sourceUrl || !title || !location || seenUrls.has(sourceUrl)) continue
    seenUrls.add(sourceUrl)

    const jobId = extractJobIdFromUrl(sourceUrl)

    results.push({
      title,
      company: COMPANY,
      department: null,
      location,
      city: normalizeWhitespace(location.split(',')[0]),
      country: /,\s*IN$/i.test(location) ? 'India' : null,
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate,
      closingDate: null,
      jobDescription: null,
    })
  }

  return results
}

export const extractJobDetail = (html = '', listing = {}) => {
  const rawHtml = String(html ?? '')
  const applyUrl = toAbsoluteUrl(
    rawHtml.match(/<a[^>]+class="btn[^"]*apply[^"]*"[^>]+href="([^"]+)"/i)?.[1],
    listing.sourceUrl || SAMPLE_JOB_URL,
  )
  const jobDescription = rawHtml.match(
    /itemprop="description" class="jobdescription">([\s\S]*?)<\/div>/i,
  )?.[1] || null
  const detailLocation = stripTags(rawHtml.match(/<span class="jobGeoLocation">([\s\S]*?)<\/span>/i)?.[1] || '')
  const postingDate = stripTags(rawHtml.match(/<p[^>]+class="jobDate"[\s\S]*?<strong>\s*Date:\s*<\/strong>([\s\S]*?)<\/p>/i)?.[1] || '')
  const closingDate = toIsoDate(rawHtml.match(/itemprop="validThrough" content="([^"]+)"/i)?.[1] || null)
  const title = stripTags(rawHtml.match(/<h1 id="job-title"[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || listing.title || '')

  return {
    ...listing,
    title: title || listing.title || null,
    location: detailLocation || listing.location || null,
    city: normalizeWhitespace((detailLocation || listing.location || '').split(',')[0]),
    country: /,\s*IN$/i.test(detailLocation || listing.location || '') ? 'India' : listing.country,
    sourceUrl: listing.sourceUrl,
    applyUrl: applyUrl || listing.applyUrl,
    postingDate: postingDate || listing.postingDate,
    closingDate: closingDate || listing.closingDate,
    jobDescription: jobDescription || listing.jobDescription,
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

export const createBentleySystemsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const jobsHostHtml = await fetchText(JOBS_HOST_URL)
    if (!hasOfficialJobsHostSignal(jobsHostHtml)) {
      throw new Error('Bentley verified first-party jobs host no longer matches the known public surface')
    }

    const searchHtml = await fetchText(INDIA_SEARCH_URL)
    if (!hasIndiaSearchResultsSignal(searchHtml)) {
      throw new Error('Bentley verified India search surface no longer matches the known public results page')
    }

    const listings = extractSearchResults(searchHtml)
    const jobs = []

    for (const listing of listings) {
      const detailHtml = await fetchText(listing.sourceUrl)
      jobs.push({
        ...extractJobDetail(detailHtml, listing),
        source: SOURCE,
        link: listing.sourceUrl,
        companyCareerPage: CAREERS_URL,
        companyDomain: PROVIDER_METADATA.companyDomain,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createBentleySystemsScraper(options).run(options)

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
