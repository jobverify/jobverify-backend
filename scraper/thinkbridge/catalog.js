import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const THINKBRIDGE_CATALOG = {
  source: 'thinkbridge',
  companyName: 'thinkbridge',
  officialBrandName: 'thinkbridge',
  adapter: 'script',
  companyCareerPage: 'https://www.thinkbridge.com/job-search',
  companyDomain: 'thinkbridge.com',
  atsPlatform: 'official-webflow-job-search',
  countryFilter: 'Global',
  paginationStrategy: 'single-first-party-job-search-page',
  extractionStrategy: 'verified-first-party-job-search-page+visible-job-cards',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicJobCount: 4,
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.thinkbridge.com/job-search remained the live first-party thinkbridge job search page and exposed four visible public role cards, including ServiceNow Architect in India, Solution Engineer in the USA, and Business Systems Designer in India.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default THINKBRIDGE_CATALOG
