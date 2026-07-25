import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SIGNEASY_CATALOG = {
  source: 'signeasy',
  companyName: 'SignEasy',
  officialBrandName: 'Signeasy',
  adapter: 'script',
  companyCareerPage: 'https://signeasy.com/careers',
  officialCareersPageUrl: 'https://signeasy.com/careers',
  companyDomain: 'signeasy.com',
  atsPlatform: 'first-party-careers-page-with-no-trustworthy-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'single-public-page',
  extractionStrategy: 'verified-first-party-careers-page+no-trustworthy-public-job-listings',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that the official SignEasy careers page for this exact-name provider was https://signeasy.com/careers. The first-party page exposed culture and hiring copy including the Apply Now call-to-action, but it exposed no trustworthy public jobs, no public role detail pages, and no verifiable first-party jobs board contract that could be scraped safely, so this provider is intentionally fail-closed and returns an honest empty list until the official surface exposes trustworthy public jobs.',
  dryRunFile: 'signeasy/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SIGNEASY_CATALOG
