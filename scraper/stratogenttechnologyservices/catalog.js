import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const STRATOGENT_TECHNOLOGY_SERVICES_CATALOG = {
  source: 'stratogenttechnologyservices',
  companyName: 'Stratogent Technology Services',
  officialBrandName: 'Stratogent',
  adapter: 'script',
  homepageUrl: 'https://www.stratogent.com/',
  companyCareerPage: 'https://www.stratogent.com/careers/',
  companyDomain: 'stratogent.com',
  atsPlatform: 'official-company-careers-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'single-email-only-careers-page',
  extractionStrategy:
    'verified-first-party-careers-page+always-hiring-email-copy+no-public-job-cards-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.stratogent.com/careers/ is the official first-party Stratogent careers page. The live page says Stratogent is an "always hiring" company and instructs applicants to email careers@stratogent.com or careers-india@stratogent.com, but it exposes no trustworthy public job cards, detail pages, or ATS listings, so this local provider fails closed and returns an empty result.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'stratogenttechnologyservices/jobs.json',
}

export default STRATOGENT_TECHNOLOGY_SERVICES_CATALOG
