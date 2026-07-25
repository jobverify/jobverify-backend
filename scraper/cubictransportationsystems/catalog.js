import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://www.cubic.com/careers handed candidates to the public Cubic Workday board, that verified Cubic Transportation Systems detail pages included Program Planner and Head of Technology and Service Operations, and that direct enumeration through the global Workday jobs API returned HTTP 500 instead of a trustworthy listing payload. This provider therefore stays fail-closed and returns an empty set until Cubic exposes a stable enumerable public CTS jobs surface.'

export const CUBIC_TRANSPORTATION_SYSTEMS_CATALOG = {
  source: 'cubictransportationsystems',
  companyName: 'Cubic Transportation Systems',
  officialBrandName: 'Cubic Transportation Systems',
  adapter: 'script',
  homepageUrl: 'https://www.cubic.com/',
  companyCareerPage: 'https://www.cubic.com/careers',
  officialWorkdayBoardUrl: 'https://cubic.wd1.myworkdayjobs.com/en-US/cubic_global_careers',
  jobsApiUrl: 'https://cubic.wd1.myworkdayjobs.com/wday/cxs/cubic/cubic_global_careers/jobs',
  companyDomain: 'cubic.com',
  atsPlatform: 'workday-board-blocked-enumeration',
  countryFilter: 'India',
  paginationStrategy: 'verified-careers-handoff-plus-blocked-workday-api',
  extractionStrategy:
    'verified-cubic-careers-page+verified-workday-board+verified-cts-job-details+blocked-global-jobs-enumeration+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'cubictransportationsystems/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default CUBIC_TRANSPORTATION_SYSTEMS_CATALOG
