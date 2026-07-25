import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://www.telstra.com.au/careers is the live first-party Telstra careers page currently serving the Telstra India Careers shell and linking Find a career to the public Workday board at https://telstra.wd3.myworkdayjobs.com/Telstra_Careers. Verified that the public Workday jobs API at https://telstra.wd3.myworkdayjobs.com/wday/cxs/telstra/Telstra_Careers/jobs is live, returned 169 unfiltered jobs, and returned 2 India-filtered Bengaluru jobs including WFM Specialist and Customer Service Consultant - International Voice Process.'

export const TELSTRA_CATALOG = {
  source: 'telstra',
  companyName: 'Telstra',
  officialBrandName: 'Telstra',
  adapter: 'script',
  companyCareerPage: 'https://www.telstra.com.au/careers',
  officialCareersPageUrl: 'https://www.telstra.com.au/careers',
  officialWorkdayBoardUrl: 'https://telstra.wd3.myworkdayjobs.com/Telstra_Careers',
  jobsApiUrl: 'https://telstra.wd3.myworkdayjobs.com/wday/cxs/telstra/Telstra_Careers/jobs',
  companyDomain: 'telstra.com.au',
  atsPlatform: 'workday',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-handoff-plus-workday-jobs-api-country-facet',
  extractionStrategy: 'verified-first-party-careers-page+verified-workday-handoff+workday-jobs-api+india-country-facet',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'telstra/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default TELSTRA_CATALOG
