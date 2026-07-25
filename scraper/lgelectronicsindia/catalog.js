import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const LG_ELECTRONICS_INDIA_CATALOG = {
  source: 'lgelectronicsindia',
  companyName: 'LG Electronics India',
  officialBrandName: 'LG Electronics India',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'lgelectronicsindia/jobs.json',
  companyCareerPage: 'https://globalcareers.lge.com/locations/IN',
  companyDomain: 'globalcareers.lge.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-lg-global-careers-india-location-page-no-openings',
  extractionStrategy:
    'verified-lg-global-careers-india-location-page+verified-no-openings-message-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://globalcareers.lge.com/locations/IN is the live LG Global Careers India location page and that the exact-name LG Electronics India tab on that first-party surface currently states "There are no open positions at the moment. Please check other job categories." No trustworthy public LG Electronics India job listings were exposed on the verified exact-name first-party page, so this provider is a fail-closed sentinel returning no jobs until the public surface changes.',
}

export default LG_ELECTRONICS_INDIA_CATALOG
