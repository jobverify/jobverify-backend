import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, August 1, 2026 that https://www.cubic.com/global-careers still handed Global Career Opportunities to the public Cubic Workday board at https://cubic.wd1.myworkdayjobs.com/cubic_global_careers/jobs in a browser, while direct scraper fetches to the first-party page returned a known Incapsula interstitial. Also verified that the public Workday board remained live, that the Workday jobs API at https://cubic.wd1.myworkdayjobs.com/wday/cxs/cubic/cubic_global_careers/jobs enumerated 87 public postings across offsets 0 through 80 even though later pages reported total 0, and that structured JobPosting detail pages such as Senior Site Reliability Engineer and Head of Technology and Service Operations exposed India locations plus Business Unit: Cubic Transportation Systems. Saturday, August 1, 2026 counts were 87 public global postings, 35 India-addressed postings on the board, and 30 India postings whose detail pages were explicitly tagged to Cubic Transportation Systems; the scraper now returns that CTS subset.'

export const CUBIC_TRANSPORTATION_SYSTEMS_CATALOG = {
  source: 'cubictransportationsystems',
  companyName: 'Cubic Transportation Systems',
  officialBrandName: 'Cubic Transportation Systems',
  adapter: 'script',
  homepageUrl: 'https://www.cubic.com/',
  companyCareerPage: 'https://www.cubic.com/global-careers',
  officialWorkdayBoardUrl: 'https://cubic.wd1.myworkdayjobs.com/cubic_global_careers/jobs',
  jobsApiUrl: 'https://cubic.wd1.myworkdayjobs.com/wday/cxs/cubic/cubic_global_careers/jobs',
  companyDomain: 'cubic.com',
  atsPlatform: 'workday-jobs-api-with-detail-jsonld',
  countryFilter: 'India',
  paginationStrategy: 'workday-cxs-offset-pagination-until-short-page',
  extractionStrategy:
    'verified-cubic-global-careers-handoff-or-incapsula-block+verified-workday-board+india-summary-candidate-filter+detail-jsonld-business-unit-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-01',
  verifiedPublicJobCount: 87,
  verifiedIndiaBoardJobCount: 35,
  verifiedIndiaJobCount: 30,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'cubictransportationsystems/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default CUBIC_TRANSPORTATION_SYSTEMS_CATALOG
