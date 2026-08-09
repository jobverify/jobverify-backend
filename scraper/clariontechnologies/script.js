import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchPageWithRetry } from '../../scraper-support/utils/fetchPageWithRetry.js'

import { CLARION_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = CLARION_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const FEATURED_JOBS_URL = PROVIDER_METADATA.featuredJobsUrl
export const OPENINGS_URL = PROVIDER_METADATA.openingsUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const ALLOW_INSECURE_TLS_HOSTS = [
  'jobs.clariontechnologies.co.in',
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const extractTitle = (html = '') =>
  normalizeWhitespace(String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])

export const defaultFetchPage = (url, {
  fetchPageImpl = fetchPageWithRetry,
} = {}) => fetchPageImpl(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
  allowInsecureTlsHosts: ALLOW_INSECURE_TLS_HOSTS,
})

export const defaultFetchText = async (url, options = {}) => {
  const page = await defaultFetchPage(url, options)
  return page.html
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return extractTitle(page) === 'Careers | Clarion Technologies'
    && text.includes('Permanent Work From Home Opportunity')
    && page.includes(FEATURED_JOBS_URL)
}

export const hasFeaturedJobsSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return text.includes('Featured Jobs')
    && page.includes('open-position-detail?jobid=2674')
    && text.includes('SQL Database Developer')
    && page.includes(OPENINGS_URL)
}

export const createClarionTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Clarion Technologies official careers page no longer matches the verified first-party surface')
    }

    const featuredJobsHtml = await fetchText(FEATURED_JOBS_URL)
    if (!hasFeaturedJobsSignal(featuredJobsHtml)) {
      throw new Error('Clarion Technologies featured jobs iframe no longer matches the verified public surface')
    }

    return []
  },
})

export const run = async (options = {}) => createClarionTechnologiesScraper().run(options)

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
