import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY = 'Verified on Friday, July 17, 2026 that the official Syllable AI careers page at https://syllable.ai/careers linked directly to the public Rippling board at https://ats.rippling.com/syllable-corporation/jobs, and that the live board exposed a Software Engineer II opening with a public detail page on ats.rippling.com for Syllable Corporation in Mountain View, CA. No India openings were verified on the public board on the verified date, so the exact provider currently returns [] after validating the linked jobs surface.'

export const SYLLABLE_CATALOG = {
  source: 'syllable',
  companyName: 'Syllable',
  officialBrandName: 'Syllable AI',
  adapter: 'script',
  companyCareerPage: 'https://syllable.ai/careers',
  officialCareersPageUrl: 'https://syllable.ai/careers',
  linkedJobsBoardUrl: 'https://ats.rippling.com/syllable-corporation/jobs',
  linkedJobsBoardHost: 'ats.rippling.com',
  linkedJobsBoardSlug: 'syllable-corporation',
  companyDomain: 'syllable.ai',
  atsPlatform: 'rippling',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-linked-rippling-board-page',
  extractionStrategy: 'verified-first-party-careers-page+verified-rippling-board-page+india-job-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'syllable/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SYLLABLE_CATALOG
