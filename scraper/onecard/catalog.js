import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ONECARD_CATALOG = {
  source: 'onecard',
  companyName: 'OneCard',
  officialBrandName: 'OneCard',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  companyCareerPage: 'https://www.getonecard.app/careers/',
  officialCareersHandoffUrl: 'https://www.fplabs.tech/careers/',
  officialJobsApiUrl: 'https://ibffpublic6f2461135ffd1b6a80db296ec15abf.onrender.com/hr/jobs',
  officialJobsApiKey: 'hr-read-only',
  officialApplyUrl: 'mailto:careers@getonecard.app',
  companyDomain: 'getonecard.app',
  atsPlatform: 'official-careers-page-plus-public-read-only-api',
  countryFilter: 'India',
  paginationStrategy: 'single-public-jobs-api-response',
  extractionStrategy: 'verified-official-careers-page+fpl-handoff+embedded-public-jobs-api+mailto-apply',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on July 17, 2026 that https://www.getonecard.app/careers/ is the official OneCard careers page, that it links applicants to https://www.fplabs.tech/careers/, and that the page itself embeds the public read-only jobs API at https://ibffpublic6f2461135ffd1b6a80db296ec15abf.onrender.com/hr/jobs with x-api-key hr-read-only plus the official apply mailto careers@getonecard.app. The verified public API returned 0 public openings at the time of verification.',
  dryRunFile: 'onecard/jobs.json',
}

export default ONECARD_CATALOG
