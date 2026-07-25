import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that the richer live ICICI Securities first-party careers surface is ' +
  'https://www.icicisecurities.com/careers-current-opening, which loads public listings from the first-party ' +
  'JSON endpoint https://www.icicisecurities.com/get-branches. The verified feed returned 4 public rows on the ' +
  'verified date, but only 1 active opening still had a closing date on or after July 16, 2026: ' +
  '"Private Wealth Relationship Manager". Older rows remained in the feed with past closing dates, so the scraper ' +
  'filters stale postings fail-closed instead of guessing which expired jobs are still valid.'

export const ICICI_SECURITIES_CATALOG = {
  source: 'icicisecurities',
  companyName: 'ICICI Securities',
  officialBrandName: 'ICICI Securities',
  adapter: 'script',
  companyCareerPage: 'https://www.icicisecurities.com/careers-current-opening',
  listingApiUrl: 'https://www.icicisecurities.com/get-branches',
  companyDomain: 'icicisecurities.com',
  atsPlatform: 'official-company-ajax-careers',
  countryFilter: 'India',
  verifiedRawJobCount: 4,
  verifiedActiveJobCount: 1,
  verifiedActiveSampleTitle: 'Private Wealth Relationship Manager',
  paginationStrategy: 'single-official-page-plus-json-listing-endpoint',
  extractionStrategy:
    'verified-current-openings-page+first-party-json-listing-endpoint+closing-date-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'icicisecurities/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default ICICI_SECURITIES_CATALOG
