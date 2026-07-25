import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MUVI_ENTERTAINMENT_CATALOG = {
  source: 'muvientertainment',
  companyName: 'Muvi Entertainment',
  officialBrandName: 'Muvi',
  adapter: 'script',
  homepageUrl: 'https://www.muvi.com/',
  companyCareerPage: 'https://www.muvi.com/career/',
  atsPlatform: 'simple-job-board-wordpress',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page',
  extractionStrategy: 'verified-first-party-careers-page+simple-job-board-listing',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'muvi.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.muvi.com/career/ remained the exact first-party Muvi careers page and publicly exposed Simple Job Board listings including Email Outreach Manager, Product Marketing Specialist, Database Administrator, and Senior JAVA developer in Bhubaneswar, India.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default MUVI_ENTERTAINMENT_CATALOG
