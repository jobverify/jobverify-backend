import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CAREER_PAGE_URL as BASE_CAREER_PAGE_URL,
  createSocieteGeneraleScraper,
  extractJobDetail,
  extractSearchResults,
} from '../societegenerale/script.js'

import { SOCGEN_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = SOCGEN_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const SIGNAL_PATTERNS = [
  /All Job offers at Societe Generale/i,
  /\d+\s+offre\(s\)/i,
  /Senior Analyst/i,
  /Bangalore,\s*India/i,
  /Delivery Manager/i,
  /Chennai,\s*India/i,
]

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

export { extractJobDetail, extractSearchResults }

const normalizeSignalText = (html = '') => String(html ?? '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

export const hasVerifiedSocGenCareersPageSignal = (html = '') =>
  SIGNAL_PATTERNS.every((pattern) => pattern.test(normalizeSignalText(html)))

export const decorateSocGenJob = (job = {}, scrapedAt) => ({
  ...job,
  company: COMPANY,
  source: SOURCE,
  link: job.link || job.applyUrl || job.sourceUrl || null,
  companyCareerPage: CAREERS_URL,
  companyDomain: PROVIDER_METADATA.companyDomain,
  atsPlatform: PROVIDER_METADATA.atsPlatform,
  scrapedAt,
})

export const createSocGenScraper = ({
  maxJobs = null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchText,
  } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)
    if (
      Number(careersPage?.status) !== 200
      || String(careersPage?.url ?? '') !== CAREERS_URL
      || !hasVerifiedSocGenCareersPageSignal(careersPage?.html)
    ) {
      throw new Error('SocGen verified SocGen careers page no longer matches the pinned public Societe Generale surface')
    }

    const jobs = await createSocieteGeneraleScraper({ maxJobs }).run({ fetchText })
    const scrapedAt = now()
    return jobs.map((job) => decorateSocGenJob(job, scrapedAt))
  },
})

export const run = async (options = {}) => createSocGenScraper(options).run(options)

if (BASE_CAREER_PAGE_URL !== CAREERS_URL) {
  throw new Error('SocGen wrapper metadata drifted from the verified Societe Generale careers page contract')
}

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
