import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const BIZMATICS_INDIA_CATALOG = {
  source: 'bizmaticsindia',
  companyName: 'Bizmatics India',
  officialBrandName: 'Bizmatics',
  adapter: 'script',
  homepageUrl: 'https://www.bizmatics.com/',
  companyCareerPage: 'https://www.bizmatics.com/company/careers/',
  soldDomainUrl: 'https://www.bizmatics.com/lander',
  companyDomain: 'bizmatics.com',
  atsPlatform: 'official-company-careers-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'homepage-and-careers-shell-redirect-validation',
  extractionStrategy:
    'verified-homepage-shell+verified-careers-shell+verified-domain-sale-lander+no-public-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that both https://www.bizmatics.com/ and https://www.bizmatics.com/company/careers/ now return the same lightweight JavaScript redirect shell, and that the redirect target /lander resolves to a GoDaddy for-sale page for bizmatics.com rather than a live first-party Bizmatics careers surface. There is no trustworthy public jobs surface for Bizmatics India on the verified date, so the local provider fails closed and returns an empty result.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'bizmaticsindia/jobs.json',
}

export default BIZMATICS_INDIA_CATALOG
