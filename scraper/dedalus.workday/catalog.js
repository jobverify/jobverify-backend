import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const DEDALUS_CATALOG = {
  source: 'dedalus',
  companyName: 'Dedalus',
  officialBrandName: 'Dedalus',
  adapter: 'script',
  companyCareerPage: 'https://www.dedalus.com/global/en/careers/',
  officialJobOffersPageUrl: 'https://www.dedalus.com/global/en/working-at-dedalus/our-job-offers/',
  officialWorkdayBoardUrl: 'https://dedalus.wd3.myworkdayjobs.com/External',
  jobsApiUrl: 'https://dedalus.wd3.myworkdayjobs.com/wday/cxs/dedalus/External/jobs',
  verifiedIndiaCountryFacetId: 'c4f78be1a8f14da0ab49ce1162348a5e',
  verifiedIndiaLocationDescriptors: [
    'IND - Chennai',
    'IND - New Delhi - Noida',
  ],
  verifiedIndiaJobUrls: [
    'https://dedalus.wd3.myworkdayjobs.com/External/job/IND---Chennai/PAS-Integration-Engineer_JR108480',
    'https://dedalus.wd3.myworkdayjobs.com/External/job/IND---Chennai/Solution-Architect_JR108318',
  ],
  companyDomain: 'dedalus.com',
  atsPlatform: 'workday',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-handoff-plus-workday-country-facet',
  extractionStrategy:
    'verified-careers-page+verified-workday-board+unfiltered-workday-jobs-api+india-country-facet+filtered-workday-jobs-api+verified-india-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.dedalus.com/global/en/careers/ is the live Dedalus first-party careers page, that its Our Job Offers handoff at https://www.dedalus.com/global/en/working-at-dedalus/our-job-offers/ sends applicants to the public Workday board at https://dedalus.wd3.myworkdayjobs.com/External, and that the public Workday jobs API at https://dedalus.wd3.myworkdayjobs.com/wday/cxs/dedalus/External/jobs exposes an India country facet with two India roles. Verified India detail pages include Integration Engineer - Healthcare and Solution Architect on the first-party Workday surface.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'dedalus.workday/jobs.json',
}

export default DEDALUS_CATALOG
