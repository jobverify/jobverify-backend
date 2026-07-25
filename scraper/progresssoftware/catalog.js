import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROGRESS_SOFTWARE_CATALOG = {
  source: 'progresssoftware',
  companyName: 'Progress Software',
  officialBrandName: 'Progress Software Corporation',
  adapter: 'script',
  homepageUrl: 'https://www.progress.com/company/careers',
  companyCareerPage: 'https://www.progress.com/company/careers/open-positions',
  officialCareersPageUrl: 'https://www.progress.com/company/careers/open-positions',
  jobPagePrefix: 'https://www.progress.com/company/careers/open-positions/',
  companyDomain: 'progress.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-open-positions-page-plus-first-party-detail-pages',
  extractionStrategy:
    'verified-first-party-careers-homepage+verified-open-positions-list+india-location-filter+first-party-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.progress.com/company/careers was the official Progress Software careers homepage, that the first-party open roles surface at https://www.progress.com/company/careers/open-positions publicly exposed India (11) and direct first-party detail pages under https://www.progress.com/company/careers/open-positions/, and that the live India list included roles such as Manager, Software Engineering, Principal Software Engineer ( Lead RUST Developer), and Technical Support Engineer, Senior 1(Open Edge/ Oracle DBA).',
  dryRunFile: 'progresssoftware/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default PROGRESS_SOFTWARE_CATALOG
