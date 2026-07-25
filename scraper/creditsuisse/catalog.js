import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CREDIT_SUISSE_CATALOG = {
  source: 'creditsuisse',
  companyName: 'Credit Suisse',
  adapter: 'script',
  companyCareerPage: 'https://www.credit-suisse.com/careers/en.html',
  companyDomain: 'credit-suisse.com',
  atsPlatform: 'legacy-brand-redirect-to-ubs-careers',
  countryFilter: 'India',
  paginationStrategy: 'legacy-credit-suisse-careers-redirect-plus-ubs-search-jobs-validation',
  extractionStrategy: 'verified-credit-suisse-redirect-to-ubs-careers+ubs-search-jobs-handoff-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  legacyHomepageUrl: 'https://www.credit-suisse.com/us/en.html',
  officialHomepageRedirectUrl: 'https://www.ubs.com/us/en.html',
  officialCareersRedirectUrl: 'https://www.ubs.com/global/en/careers.html',
  officialSearchJobsUrl: 'https://www.ubs.com/global/en/careers/search-jobs.html',
  officialJobsBoardHost: 'https://jobs.ubs.com',
  verifiedOn: '2026-07-14',
  verifiedSurfaceSummary:
    'As of July 14, 2026, the Credit Suisse careers URL redirects to UBS Global Careers and the official UBS search-jobs page hands off to jobs.ubs.com, so there is no trustworthy Credit Suisse-branded public jobs surface to attribute India roles.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default CREDIT_SUISSE_CATALOG
