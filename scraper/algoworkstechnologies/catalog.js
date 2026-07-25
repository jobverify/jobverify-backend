import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ALGOWORKS_TECHNOLOGIES_CATALOG = {
  source: 'algoworkstechnologies',
  companyName: 'Algoworks Technologies',
  officialBrandName: 'Algoworks',
  adapter: 'script',
  companyCareerPage: 'https://www.algoworks.com/careers/',
  companyDomain: 'algoworks.com',
  atsPlatform: 'official-company-site-email-handoff',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-page-email-handoff',
  extractionStrategy: 'verified-first-party-careers-page+resume-email-handoff+no-first-party-job-listings',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.algoworks.com/careers/ is the live first-party Algoworks careers page and that it currently uses an "Email the Careers team" handoff with no structured first-party openings, so there is no trustworthy public first-party jobs feed to scrape.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'algoworkstechnologies/jobs.json',
}

export default ALGOWORKS_TECHNOLOGIES_CATALOG
