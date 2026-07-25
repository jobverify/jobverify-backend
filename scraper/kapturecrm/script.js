import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ACTIVE_JOBS_URL as BASE_ACTIVE_JOBS_URL,
  CAREER_PAGE_URL as BASE_CAREERS_URL,
  DEPARTMENTS_URL as BASE_DEPARTMENTS_URL,
  EMBED_CONFIG_URL as BASE_EMBED_CONFIG_URL,
  PROVIDER_METADATA as BASE_PROVIDER_METADATA,
  createKaptureScraper,
} from '../kapture/script.js'

import { KAPTURE_CRM_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const CAREERS_SIGNAL_PATTERNS = [
  /Kapture CRM Careers/i,
  /Kapture Careers/i,
  /Kapture CRM/i,
]

const EMBED_IDENTIFIER = '30315393-d861-4cad-851c-03e99c4fe979'

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/javascript,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return response.text()
}

export const PROVIDER_METADATA = KAPTURE_CRM_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const EMBED_CONFIG_URL = PROVIDER_METADATA.embedConfigUrl
export const ACTIVE_JOBS_URL = PROVIDER_METADATA.activeJobsUrl
export const DEPARTMENTS_URL = PROVIDER_METADATA.departmentsUrl
export const COMPANY_DOMAIN = PROVIDER_METADATA.companyDomain
export const ATS_PLATFORM = PROVIDER_METADATA.atsPlatform
export const COUNTRY_FILTER = PROVIDER_METADATA.countryFilter
export const PAGINATION_STRATEGY = PROVIDER_METADATA.paginationStrategy
export const PARSER = PROVIDER_METADATA.parser
export const NORMALIZATION_PROFILE = PROVIDER_METADATA.normalizationProfile
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

export const hasVerifiedKaptureCrmCareersPageSignal = (html = '') =>
  CAREERS_SIGNAL_PATTERNS.every((pattern) => pattern.test(String(html ?? '')))

export const hasVerifiedKaptureCrmEmbedConfigSignal = (scriptText = '') =>
  new RegExp(EMBED_IDENTIFIER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(String(scriptText ?? ''))

export const decorateKaptureCrmJob = (job = {}, scrapedAt) => ({
  ...job,
  company: COMPANY,
  source: SOURCE,
  link: job.link || job.applyUrl || job.sourceUrl || null,
  companyCareerPage: CAREERS_URL,
  companyDomain: COMPANY_DOMAIN,
  atsPlatform: ATS_PLATFORM,
  scrapedAt,
})

export const createKaptureCrmScraper = ({
  maxJobs = null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson,
  } = {}) {
    const careersPageHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedKaptureCrmCareersPageSignal(careersPageHtml)) {
      throw new Error('Kapture CRM verified Kapture CRM careers page no longer matches the pinned first-party surface')
    }

    const embedConfigText = await fetchText(EMBED_CONFIG_URL)
    if (!hasVerifiedKaptureCrmEmbedConfigSignal(embedConfigText)) {
      throw new Error('Kapture CRM verified Kapture CRM embed config no longer matches the pinned Keka contract')
    }

    const cachedFetchText = async (url) => {
      if (url === CAREERS_URL) return careersPageHtml
      if (url === EMBED_CONFIG_URL) return embedConfigText
      return fetchText(url)
    }

    const jobs = await createKaptureScraper({ maxJobs }).run({
      fetchText: cachedFetchText,
      fetchJson,
    })

    const scrapedAt = now()
    return jobs.map((job) => decorateKaptureCrmJob(job, scrapedAt))
  },
})

export const run = async (options = {}) => createKaptureCrmScraper(options).run(options)

if (
  BASE_CAREERS_URL !== CAREERS_URL
  || BASE_EMBED_CONFIG_URL !== EMBED_CONFIG_URL
  || BASE_ACTIVE_JOBS_URL !== ACTIVE_JOBS_URL
  || BASE_DEPARTMENTS_URL !== DEPARTMENTS_URL
  || BASE_PROVIDER_METADATA.companyDomain !== COMPANY_DOMAIN
  || BASE_PROVIDER_METADATA.atsPlatform !== ATS_PLATFORM
) {
  throw new Error('Kapture CRM wrapper metadata drifted from the verified Kapture Keka contract')
}

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
