import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AGILOFT_INDIA_CATALOG = {
  source: 'agiloftindia',
  companyName: 'Agiloft India',
  officialBrandName: 'Agiloft',
  adapter: 'script',
  companyCareerPage: 'https://www.agiloft.com/careers/',
  companyDomain: 'agiloft.com',
  officialCareersAliasUrl: 'https://www.agiloft.com/about-us/careers/',
  officialLeverBoardUrl: 'https://jobs.lever.co/agiloft',
  leverApiUrl: 'https://api.lever.co/v0/postings/agiloft?mode=json',
  atsPlatform: 'lever',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-validation-plus-lever-api',
  extractionStrategy:
    'verified-first-party-careers-page+verified-lever-board+lever-postings-api+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-14',
  verifiedSurfaceSummary:
    'Verified on July 14, 2026 that https://www.agiloft.com/careers/ and https://www.agiloft.com/about-us/careers/ both resolve to Agiloft’s live first-party careers experience, and that page hands applicants to the public Lever board at https://jobs.lever.co/agiloft. The verified public board currently surfaces roles only in Canada, the United Kingdom, and the United States, so there are no India roles live for Agiloft India right now.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AGILOFT_INDIA_CATALOG
