import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const OFB_TECH_CATALOG = {
  source: 'ofbtech',
  companyName: 'OFB Tech',
  officialBrandName: 'OFB Tech',
  adapter: 'script',
  officialHomepageUrl: 'https://www.ofbcareers.com/',
  companyCareerPage: 'https://www.ofbcareers.com/',
  officialListingsPageUrl: 'https://www.ofbcareers.com/categories',
  officialJobDetailsBaseUrl: 'https://www.ofbcareers.com/jobs/',
  companyDomain: 'ofbcareers.com',
  atsPlatform: 'wix',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-wix-listings-page',
  extractionStrategy: 'verified-homepage+verified-listings-page+embedded-warmup-json-jobs-collection',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'ofbtech/jobs.json',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.ofbcareers.com/ is the official first-party careers homepage branded to OFB Tech Pvt. Ltd., that https://www.ofbcareers.com/categories is the live public listings page backed by an embedded jobs dataset, and that detail pages such as https://www.ofbcareers.com/jobs/frontend-developer- publicly expose OFB Tech (OfBusiness) role context.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default OFB_TECH_CATALOG
