import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://www.tanla.com/careers is the live official Tanla careers page, that its Explore Jobs CTA hands candidates to the first-party jobs listing at https://www.tanla.com/careers/jobs-listing, and that the public listing currently exposes visible first-party roles including Sr QA Automation Engineer, Data Engineer, and Data Analyst. Verified that the sample first-party detail route https://www.tanla.com/job-info/sr-qa-automation-engineer is live on the verified date.'

export const TANLA_PLATFORMS_CATALOG = {
  source: 'tanlaplatforms',
  companyName: 'Tanla Platforms',
  officialBrandName: 'Tanla Platforms Limited',
  adapter: 'script',
  homepageUrl: 'https://www.tanla.com/',
  companyCareerPage: 'https://www.tanla.com/careers',
  officialJobsHandoffUrl: 'https://www.tanla.com/careers/jobs-listing',
  verifiedSampleJobUrl: 'https://www.tanla.com/job-info/sr-qa-automation-engineer',
  companyDomain: 'tanla.com',
  atsPlatform: 'first-party-job-board',
  countryFilter: 'India',
  paginationStrategy: 'single-listing-page',
  extractionStrategy:
    'verified-first-party-careers-handoff+verified-first-party-jobs-listing+first-party-job-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'tanlaplatforms/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default TANLA_PLATFORMS_CATALOG
