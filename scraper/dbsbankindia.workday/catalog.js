import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.dbs.com/careers/default.page is the live first-party DBS careers page and links Explore Jobs to the public Workday board at https://dbs.wd3.myworkdayjobs.com/DBS_Careers. The public Workday jobs API at https://dbs.wd3.myworkdayjobs.com/wday/cxs/dbs/DBS_Careers/jobs exposes a stable India country facet with id c4f78be1a8f14da0ab49ce1162348a5e and returns 484 India roles when filtered to that verified facet, including https://dbs.wd3.myworkdayjobs.com/DBS_Careers/job/Kolkata-DBIL/Associate--Relationship-Manager--Credit-Program-Small--Small-Medium-Enterprises_WD86720.'

export const DBS_BANK_INDIA_CATALOG = {
  source: 'dbsbankindia',
  companyName: 'DBS Bank India',
  officialBrandName: 'DBS',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'dbsbankindia.workday/jobs.json',
  companyCareerPage: 'https://www.dbs.com/careers/default.page',
  companyDomain: 'dbs.com',
  officialHomepageUrl: 'https://www.dbs.com/in/index/default.page',
  officialWorkdayBoardUrl: 'https://dbs.wd3.myworkdayjobs.com/DBS_Careers',
  jobsApiUrl: 'https://dbs.wd3.myworkdayjobs.com/wday/cxs/dbs/DBS_Careers/jobs',
  verifiedIndiaCountryFacetId: 'c4f78be1a8f14da0ab49ce1162348a5e',
  verifiedIndiaJobUrl:
    'https://dbs.wd3.myworkdayjobs.com/DBS_Careers/job/Kolkata-DBIL/Associate--Relationship-Manager--Credit-Program-Small--Small-Medium-Enterprises_WD86720',
  atsPlatform: 'workday',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-handoff-plus-workday-country-facet',
  extractionStrategy:
    'verified-careers-page+verified-workday-board+unfiltered-workday-jobs-api+india-country-facet+filtered-workday-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default DBS_BANK_INDIA_CATALOG
