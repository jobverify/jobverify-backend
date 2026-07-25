import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { TIBCO_SOFTWARE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = TIBCO_SOFTWARE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CAREERS_HUB_URL = PROVIDER_METADATA.careersHubUrl
export const CAREERS_SEARCH_URL = PROVIDER_METADATA.careersSearchUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasOfficialContactPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Contact Us \| TIBCO\s*<\/title>/i.test(rawHtml)
    && normalized.includes('Find your next JOB OPPORTUNITY')
    && /href="https:\/\/careers\.cloud\.com\/"/i.test(rawHtml)
}

export const extractOfficialCareersHubUrl = (html = '') => {
  const match = String(html ?? '').match(/href="(https:\/\/careers\.cloud\.com\/)"/i)
  return match?.[1] || null
}

export const hasGenericCloudCareersHubSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(html)

  return normalized.includes('TIBCO, Cloud Software Group is now one of the world’s largest cloud solution providers')
    && normalized.includes('Cloud Software Group')
    && /href="https:\/\/careers\.cloud\.com\/jobs\/search"/i.test(rawHtml)
}

export const hasGenericCloudCareersSearchSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return normalized.includes('Search Jobs')
    && normalized.includes('Non-TIBCO Office')
    && /https:\/\/careers\.cloud\.com\/jobs\//i.test(rawHtml)
    && !/data-filter="brand"/i.test(rawHtml)
}

export const createTibcoSoftwareScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const contactPageHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialContactPageSignal(contactPageHtml)) {
      throw new Error('TIBCO verified official contact page no longer matches the known public surface')
    }

    if (extractOfficialCareersHubUrl(contactPageHtml) !== CAREERS_HUB_URL) {
      throw new Error('TIBCO official contact page no longer points to the verified careers hub')
    }

    const careersHubHtml = await fetchText(CAREERS_HUB_URL)
    if (!hasGenericCloudCareersHubSignal(careersHubHtml)) {
      throw new Error('TIBCO linked careers hub no longer matches the verified generic Cloud Software Group surface')
    }

    const careersSearchHtml = await fetchText(CAREERS_SEARCH_URL)
    if (!hasGenericCloudCareersSearchSignal(careersSearchHtml)) {
      throw new Error('TIBCO linked careers search page no longer matches the verified generic multi-brand search surface')
    }

    return []
  },
})

export const run = async (options = {}) => createTibcoSoftwareScraper().run(options)

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
