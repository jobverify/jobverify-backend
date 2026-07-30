import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://www.holidayiq.com/ was HolidayIQ\'s live first-party consumer travel surface, with no trustworthy public careers page or enumerable India job listing surface. This provider is pinned as a fail-closed exact-name sentinel and returns no jobs until HolidayIQ publishes a verifiable first-party openings surface.'

export const HOLIDAYIQ_CATALOG = {
  source: 'holidayiq',
  companyName: 'HolidayIQ',
  officialBrandName: 'HolidayIQ',
  adapter: 'script',
  companyCareerPage: 'https://www.holidayiq.com/',
  companyDomain: 'holidayiq.com',
  atsPlatform: 'official-first-party-surface-no-careers-sentinel',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-homepage-validation',
  extractionStrategy:
    'verified-first-party-homepage-without-trustworthy-careers-or-india-enumeration+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedPublicJobCount: 0,
  verifiedIndiaJobCount: 0,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'holidayiq/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default HOLIDAYIQ_CATALOG
