import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CALPION_SOFTWARE_TECHNOLOGIES_CATALOG = {
  source: 'calpionsoftwaretechnologies',
  companyName: 'Calpion Software Technologies',
  officialBrandName: 'Calpion',
  adapter: 'script',
  homepageUrl: 'https://www.calpion.com/',
  companyCareerPage: 'https://www.calpion.com/career',
  officialCareersPageUrl: 'https://www.calpion.com/career',
  companyDomain: 'calpion.com',
  atsPlatform: 'official-first-party-career-cards',
  countryFilter: 'India',
  paginationStrategy: 'single-career-page',
  extractionStrategy: 'career-card-listing',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.calpion.com/career was the live first-party Calpion careers page and that it publicly exposed first-party career cards with Apply Now links for roles including Lead - AWS, Marketing Coordinator, and Process Associate - Charge Entry.',
  dryRunFile: 'calpionsoftwaretechnologies/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default CALPION_SOFTWARE_TECHNOLOGIES_CATALOG
