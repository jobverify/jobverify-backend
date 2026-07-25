import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://careers.basware.com/ was the live first-party Basware careers page and exposed an Open Positions section backed by a Jobylon embed shell (`jobylon-jobs-widget` loading `https://cdn.jobylon.com/embedder.js`). Because the public jobs inventory was not trustworthily enumerable from the first-party page in this environment, this local provider is pinned as a fail-closed sentinel that returns an empty set until Basware exposes a stable public listing surface.'

export const BASWARE_CATALOG = {
  source: 'basware',
  companyName: 'Basware',
  officialBrandName: 'Basware',
  adapter: 'script',
  homepageUrl: 'https://www.basware.com/',
  companyCareerPage: 'https://careers.basware.com/',
  officialCareersPageUrl: 'https://careers.basware.com/',
  companyDomain: 'basware.com',
  atsPlatform: 'official-careers-page-jobylon-shell-sentinel',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-page-jobylon-shell-validation',
  extractionStrategy:
    'verified-first-party-careers-page+verified-jobylon-shell-without-trusted-public-enumeration+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicJobCount: 0,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'basware/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default BASWARE_CATALOG
