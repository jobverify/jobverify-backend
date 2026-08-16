import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, August 13, 2026 that https://www.metricstream.com/ is the live official homepage, that https://www.metricstream.com/about-us/careers.htm is the first-party careers page, and that its Search Open Positions link hands off to the public SuccessFactors board at https://career5.successfactors.eu/career?company=metricstre. The public search surface at https://career5.successfactors.eu/career?company=metricstre&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH& now boots through the public SuccessFactors DWR contract and returned 3 public postings, all outside India on this date. A live sample detail page was verified at https://career5.successfactors.eu/career?career_ns=job_listing&company=metricstre&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&career_job_req_id=3567&selected_lang=en_US&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta for Financial Data Engineer.'

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
  atsPlatform: 'successfactors',
  countryFilter: 'India',
  paginationStrategy: 'successfactors-dwr-initial-search',
  extractionStrategy:
    'verified-first-party-homepage+verified-first-party-careers-page+successfactors-bootstrap+dwr-search-results+india-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-13',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default METRICSTREAM_CATALOG
