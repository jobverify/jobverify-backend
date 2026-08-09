import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CLASSPLUS_CATALOG = {
  source: 'classplus',
  companyName: 'Classplus',
  officialBrandName: 'Classplus',
  adapter: 'script',
  companyCareerPage: 'https://classplusapp.com/careers/open-role',
  companyDomain: 'classplusapp.com',
  atsPlatform: 'official-first-party-public-jobs-api',
  countryFilter: 'India',
  paginationStrategy: 'single-public-api-response',
  extractionStrategy: 'official-careers-page+public-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedPublicPostingCount: 0,
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://classplusapp.com/careers links to /careers/open-role, which calls the public first-party jobs API at https://crm.classplus.co/ts/jobs/get-job-list? and returned HTTP 200 JSON with data.Jobs=[] and message "Jobs Fetched Successfully".',
  dryRunFile: 'classplus/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default CLASSPLUS_CATALOG
