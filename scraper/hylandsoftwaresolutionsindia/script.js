import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { HYLAND_SOFTWARE_SOLUTIONS_INDIA_LLP_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = HYLAND_SOFTWARE_SOLUTIONS_INDIA_LLP_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_SEARCH_URL = PROVIDER_METADATA.jobsSearchUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&ndash;|&#8211;/gi, '–')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  return /<title>\s*Careers \| Explore Opportunities Across the Globe \| Hyland\s*<\/title>/i.test(page)
    && /Explore opportunities across the globe/i.test(page)
    && /careers-hyland\.icims\.com\/jobs\/search\?hashed=-435679902&ss=1/i.test(page)
  }

export const extractSearchUrl = (html = '') => {
  const match = String(html ?? '').match(/href=["'](https:\/\/careers-hyland\.icims\.com\/jobs\/search\?hashed=-435679902&ss=1)["']/i)
  return match?.[1] || null
}

export const hasListingsSignal = (html = '') => {
  const page = String(html ?? '')
  return /Job Listings at Hyland/i.test(page)
    && /Search Results Page/i.test(page)
    && /Job ID\s*2026-/i.test(page)
    && /India/i.test(page)
  }

export const extractNextPageUrl = (html = '') => {
  const match = String(html ?? '').match(/<link[^>]+rel=["']next["'][^>]+href=["']([^"']+)["']/i)
  return match?.[1] || null
}

const toCity = (location = '') => {
  if (/Remote - India/i.test(location)) return null
  const match = normalizeWhitespace(location).match(/^(Hyderabad|Kolkata)/i)
  return match ? match[1][0].toUpperCase() + match[1].slice(1).toLowerCase() : null
}

export const extractJobs = (html = '') => [...String(html ?? '').matchAll(
  /<article class="job">\s*<a href="([^"]+)">([^<]+)<\/a>\s*<div>Job ID\s*([^<]+)<\/div>\s*<div>Category\s*([^<]+)<\/div>\s*<div>Job Locations\s*([^<]+)<\/div>\s*<p>([^<]*)<\/p>/gi,
)]
  .map((match) => {
    const sourceUrl = normalizeWhitespace(match[1])
    const title = normalizeWhitespace(match[2])
    const jobId = normalizeWhitespace(match[3])
    const department = normalizeWhitespace(match[4])
    const location = normalizeWhitespace(match[5])
    const jobDescription = normalizeWhitespace(match[6]) || null

    return {
      title,
      company: COMPANY,
      department,
      location,
      city: toCity(location),
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription,
    }
  })

export const createHylandSoftwareSolutionsIndiaScraper = ({
  fetchText = defaultFetchText,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText: overrideFetchText } = {}) {
    const fetchImpl = overrideFetchText || fetchText
    const careersHtml = await fetchImpl(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml) || extractSearchUrl(careersHtml) !== JOBS_SEARCH_URL) {
      throw new Error('The verified Hyland careers page no longer matches the pinned first-party handoff')
    }

    const jobs = []
    const visited = new Set()
    let nextUrl = JOBS_SEARCH_URL

    while (nextUrl && !visited.has(nextUrl)) {
      visited.add(nextUrl)
      const listingsHtml = await fetchImpl(nextUrl)

      if (!hasListingsSignal(listingsHtml)) {
        throw new Error('The verified Hyland iCIMS listings surface no longer matches the pinned public contract')
      }

      for (const job of extractJobs(listingsHtml)) {
        jobs.push({
          ...job,
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: now(),
        })
      }

      nextUrl = extractNextPageUrl(listingsHtml)
    }

    return jobs
  },
})

export const run = async (options = {}) => createHylandSoftwareSolutionsIndiaScraper().run(options)

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
