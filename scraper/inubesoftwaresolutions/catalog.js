import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INUBE_SOFTWARE_SOLUTIONS_CATALOG = {
  source: 'inubesoftwaresolutions',
  companyName: 'Inube Software Solutions',
  officialBrandName: 'iNube',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'inubesoftwaresolutions/jobs.json',
  companyCareerPage: 'https://inubesolutions.com/careers-inube/',
  companyDomain: 'inubesolutions.com',
  atsPlatform: 'official-first-party-job-posts',
  countryFilter: 'India',
  paginationStrategy: 'single-jobs-archive-plus-linked-role-pages',
  extractionStrategy:
    'verified-official-jobs-archive+verified-role-detail-pages+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://inubesolutions.com/careers-inube/ is the live first-party iNube careers surface and that it publicly lists openings such as Technical Lead PPS and Project Manager/Associate Project Manager. Verified that linked first-party detail pages under /jobs/ expose responsibilities, experience, work mode, and India locations such as Mumbai and Bangalore, so the local scraper follows those role pages and keeps only India jobs.',
}

export default INUBE_SOFTWARE_SOLUTIONS_CATALOG
