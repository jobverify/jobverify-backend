import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const COLAN_INFOTECH_CATALOG = {
  source: 'colaninfotech',
  companyName: 'Colan Infotech',
  officialBrandName: 'Colan Infotech Pvt Ltd',
  adapter: 'script',
  homepageUrl: 'https://colaninfotech.com/',
  companyCareerPage: 'https://colaninfotech.com/career/',
  atsPlatform: 'official-company-careers-single-page-openings',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page',
  extractionStrategy:
    'verified-inline-job-summaries+verified-inline-job-description-sections+same-page-apply-cta',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'colaninfotech.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://colaninfotech.com/career/ remained Colan Infotech’s first-party careers page, exposed inline LATEST JOBS summaries with job codes such as JD005 and JD021, and published same-page descriptions for openings including Android Developer and Data Scientist.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: path.resolve(currentDir, 'jobs.json'),
}

export default COLAN_INFOTECH_CATALOG
