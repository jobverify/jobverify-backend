import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const OF_BUSINESS_CATALOG = {
  source: 'ofbusiness',
  companyName: 'OfBusiness',
  officialBrandName: 'OfBusiness',
  adapter: 'script',
  homepageUrl: 'https://www.ofbcareers.com/',
  officialCareersLandingUrl: 'https://www.ofbcareers.com/',
  companyCareerPage: 'https://www.ofbcareers.com/categories',
  companyDomain: 'ofbcareers.com',
  wixWarmupScriptId: 'wix-warmup-data',
  paginationQueryParam: 'comp-lyh6vd88_page',
  atsPlatform: 'wix-embedded-data',
  countryFilter: 'India',
  paginationStrategy: 'first-party-wix-warmup-pagination',
  extractionStrategy:
    'verified-careers-homepage+verified-categories-page+wix-warmup-data+paginated-first-party-job-slices+deduplication',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.ofbcareers.com/ is the official OfBusiness careers landing page and https://www.ofbcareers.com/categories is the official first-party paginated jobs board. The categories page exposed a first-party Wix warmup-data payload plus page navigation through 18 pages, and the verified paginated warmup slices yielded 72 unique public postings after de-duplication.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'ofbusiness/jobs.json',
}

export default OF_BUSINESS_CATALOG
