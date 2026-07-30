import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://www.skyscanner.com/jobs/current-jobs was Skyscanner\'s live first-party jobs surface. The public response exposed Current jobs team/location filters and a title/team/location search control, but no stable public job records or ATS listing feed in the fetched page contract. This provider is pinned as a fail-closed sentinel until the first-party surface exposes trustworthy enumerable openings.'

export const SKYSCANNER_CATALOG = {
  source: 'skyscanner',
  companyName: 'Skyscanner',
  officialBrandName: 'Skyscanner',
  adapter: 'script',
  homepageUrl: 'https://www.skyscanner.net/',
  companyCareerPage: 'https://www.skyscanner.com/jobs/current-jobs',
  officialCareersPageUrl: 'https://www.skyscanner.com/jobs/current-jobs',
  companyDomain: 'skyscanner.net',
  atsPlatform: 'official-first-party-jobs-page-non-enumerable-sentinel',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-jobs-page-shell-validation',
  extractionStrategy:
    'verified-first-party-jobs-page+filters-without-trustworthy-public-enumeration+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedPublicJobCount: 0,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'skyscanner/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SKYSCANNER_CATALOG
