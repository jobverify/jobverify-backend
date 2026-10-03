import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  "Verified 2026-10-03: https://www.metricstream.com/ links https://www.metricstream.com/about-us/careers.htm, which now publishes four first-party role cards and details instead of the former https://career5.successfactors.eu/career?company=metricstre handoff. The Head of Services card says Bangalore, India but its https://www.metricstream.com/careers/head-of-services.html detail header and requirements say United States; conflicting country scope remains an explicit failure and no India jobs are invented. The previous SuccessFactors parser is retained for its verified legacy contract."

export const METRICSTREAM_CATALOG = {
  source: 'metricstream',
  companyName: 'MetricStream',
  officialBrandName: 'MetricStream',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'metricstream/jobs.json',
  homepageUrl: 'https://www.metricstream.com/',
  companyCareerPage: 'https://www.metricstream.com/about-us/careers.htm',
  companyDomain: 'metricstream.com',
  successFactorsCompanyToken: 'metricstre',
  successFactorsBoardUrl: 'https://career5.successfactors.eu/career?company=metricstre',
  successFactorsSearchUrl:
    'https://career5.successfactors.eu/career?company=metricstre&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH&',
  verifiedSampleJobUrl:
    'https://career5.successfactors.eu/career?career_ns=job_listing&company=metricstre&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&career_job_req_id=3567&selected_lang=en_US&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta',
  atsPlatform: 'official-first-party-job-cards+legacy-successfactors',
  countryFilter: 'India',
  paginationStrategy: 'first-party-all-role-cards+legacy-successfactors-dwr',
  extractionStrategy:
    'verified-first-party-homepage+public-role-cards+validated-details+india-filter+legacy-successfactors',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-10-03',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default METRICSTREAM_CATALOG
