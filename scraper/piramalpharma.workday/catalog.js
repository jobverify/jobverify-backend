import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PIRAMAL_PHARMA_CATALOG = {
  source: 'piramalpharma',
  companyName: 'Piramal Pharma',
  officialBrandName: 'Piramal Pharma Limited',
  adapter: 'script',
  companyCareerPage: 'https://www.piramalpharma.com/careers',
  officialCareersPageUrl: 'https://www.piramalpharma.com/careers',
  officialWorkdayBoardUrl: 'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS',
  jobsApiUrl: 'https://piramalpharma.wd102.myworkdayjobs.com/wday/cxs/piramalpharma/PIRAMAL_EXTERNAL_CAREERS/jobs',
  verifiedIndiaCountryFacetId: 'c4f78be1a8f14da0ab49ce1162348a5e',
  verifiedIndiaJobUrl:
    'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS/job/MahadMH/Executive---Production_R00000427',
  verifiedIndiaApplyUrl:
    'https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS/job/MahadMH/Executive---Production_R00000427/apply',
  companyDomain: 'piramalpharma.com',
  atsPlatform: 'workday',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-handoff-plus-workday-country-facet',
  extractionStrategy:
    'verified-careers-page+verified-workday-board+unfiltered-workday-jobs-api+india-country-facet+filtered-workday-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.piramalpharma.com/careers is the official Piramal Pharma Limited careers page, that it hands applicants to the public Workday board at https://piramalpharma.wd102.myworkdayjobs.com/PIRAMAL_EXTERNAL_CAREERS, and that the public Workday jobs API at https://piramalpharma.wd102.myworkdayjobs.com/wday/cxs/piramalpharma/PIRAMAL_EXTERNAL_CAREERS/jobs exposes a verified India country facet. The live unfiltered payload showed 254 total postings and the verified India country facet returned 195 India roles on that date, including Executive - Production and Deputy Manager - Utility.',
  dryRunFile: 'piramalpharma.workday/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default PIRAMAL_PHARMA_CATALOG
