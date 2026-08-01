import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { TESLA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = TESLA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const INDIA_LOCALE_CAREERS_URL = PROVIDER_METADATA.indiaLocaleCareersPageUrl
export const SEARCH_PAGE_URL = PROVIDER_METADATA.searchPageUrl
export const INDIA_LISTINGS_PAGE_URL = PROVIDER_METADATA.indiaListingsPageUrl
export const SAMPLE_INDIA_ENGINEERING_JOB_URL = PROVIDER_METADATA.sampleIndiaEngineeringJobUrl
export const SAMPLE_INDIA_SUPPORT_JOB_URL = PROVIDER_METADATA.sampleIndiaSupportJobUrl
export const SAMPLE_INDIA_SERVICE_JOB_URL = PROVIDER_METADATA.sampleIndiaServiceJobUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const extractReqIdValue = (html = '') => {
  const normalized = normalizeWhitespace(html)
  const match = normalized.match(/Req\.\s*ID\s*\|?\s*(\d+)/i)
  return match?.[1] || null
}

export const buildApplyUrl = (reqId) =>
  `https://www.tesla.com/careers/search/job/apply/${String(reqId ?? '').trim()}`

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Careers\s*\|\s*Tesla\s*<\/title>/i.test(page)
    && normalized.includes('Build a World of Amazing Abundance')
    && normalized.includes('Search by Role or Department')
    && normalized.includes('Explore Jobs')
    && normalized.includes('Tesla participates in the E-Verify Program')
}

export const hasIndiaLocaleCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Build a World of Amazing Abundance')
    && normalized.includes('Become Part of Our Mission')
    && normalized.includes('Our mission is to build a world of amazing abundance.')
    && normalized.includes('Explore Jobs')
}

export const hasOfficialSearchSurfaceSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Build your Career at Tesla')
    && normalized.includes('Search by role or keyword')
    && normalized.includes('Job Category')
    && normalized.includes('Job Type')
    && normalized.includes('Region')
    && normalized.includes('Location')
    && normalized.includes('India')
    && normalized.includes('Learn More')
}

export const hasIndiaListingsEvidenceSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Build your Career at Tesla')
    && normalized.includes('Consumer Engagement Manager')
    && normalized.includes('Tesla Advisor - Mumbai')
    && normalized.includes('Customer Support Supervisor')
    && normalized.includes('Lead Generation Specialist')
    && normalized.includes('Mumbai Suburban, Maharashtra')
}

export const hasVerifiedIndiaDetailSignal = (
  html = '',
  {
    title,
    location,
    reqId,
    jobType,
  } = {},
) => {
  const normalized = normalizeWhitespace(html)
  const resolvedReqId = extractReqIdValue(html)

  return normalized.includes('Build your Career at Tesla')
    && normalized.includes(title || '')
    && normalized.includes(`Location | ${location || ''}`)
    && normalized.includes(`Req. ID | ${reqId || ''}`)
    && normalized.includes(`Job Type | ${jobType || ''}`)
    && resolvedReqId === String(reqId ?? '')
    && String(html ?? '').includes(buildApplyUrl(reqId))
    && normalized.includes('Apply')
}

export const createTeslaScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersPageHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersPageHtml)) {
      throw new Error('The verified Tesla careers page no longer matches the trusted first-party surface')
    }

    const searchPageHtml = await fetchText(SEARCH_PAGE_URL)
    if (!hasOfficialSearchSurfaceSignal(searchPageHtml)) {
      throw new Error('The verified Tesla search surface no longer matches the trusted first-party jobs UI')
    }

    const indiaListingsPageHtml = await fetchText(INDIA_LISTINGS_PAGE_URL)
    if (!hasIndiaListingsEvidenceSignal(indiaListingsPageHtml)) {
      throw new Error('The verified Tesla India listings evidence no longer matches the trusted first-party surface')
    }

    const engineeringDetailHtml = await fetchText(SAMPLE_INDIA_ENGINEERING_JOB_URL)
    if (
      !hasVerifiedIndiaDetailSignal(engineeringDetailHtml, {
        title: 'Software Engineer, Full Stack, Tesla Cloud Platform',
        location: 'Pune, Maharashtra',
        reqId: '251983',
        jobType: 'Full-time',
      })
    ) {
      throw new Error('The verified Tesla India job detail surface no longer matches the trusted first-party surface')
    }

    const supportDetailHtml = await fetchText(SAMPLE_INDIA_SUPPORT_JOB_URL)
    if (
      !hasVerifiedIndiaDetailSignal(supportDetailHtml, {
        title: 'Customer Support Specialist',
        location: 'Mumbai Suburban, Maharashtra',
        reqId: '237421',
        jobType: 'Full-time',
      })
    ) {
      throw new Error('The verified Tesla India job detail surface no longer matches the trusted first-party surface')
    }

    const serviceDetailHtml = await fetchText(SAMPLE_INDIA_SERVICE_JOB_URL)
    if (
      !hasVerifiedIndiaDetailSignal(serviceDetailHtml, {
        title: 'Service Advisor',
        location: 'Mumbai Suburban, Maharashtra',
        reqId: '237425',
        jobType: 'Full-time',
      })
    ) {
      throw new Error('The verified Tesla India job detail surface no longer matches the trusted first-party surface')
    }

    return []
  },
})

export const run = async (options = {}) => createTeslaScraper().run(options)

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
