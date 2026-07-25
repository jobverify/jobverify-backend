import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.datalogic.com/ is the live official homepage, that https://www.datalogic.com/eng/company/careers-ca-26.html is the first-party careers page, and that its SEE ALL OPEN JOBS link hands off to the public SuccessFactors board at https://career2.successfactors.eu/career?company=datalogics. The public search surface at https://career2.successfactors.eu/career?company=datalogics&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH& rendered "63 Jobs matched your search", and a live India sample detail page was verified at https://career2.successfactors.eu/career?career_ns=job_listing&company=datalogics&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&career_job_req_id=11363&selected_lang=en_US&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta for India Finance Manager in Gurgaon, India.'

export const DATALOGIC_INDIA_CATALOG = {
  source: 'datalogicindia',
  companyName: 'Datalogic India',
  officialBrandName: 'Datalogic',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'datalogicindia/jobs.json',
  homepageUrl: 'https://www.datalogic.com/',
  companyCareerPage: 'https://www.datalogic.com/eng/company/careers-ca-26.html',
  successFactorsCompanyToken: 'datalogics',
  successFactorsBoardUrl: 'https://career2.successfactors.eu/career?company=datalogics',
  successFactorsSearchUrl:
    'https://career2.successfactors.eu/career?company=datalogics&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH&',
  verifiedSampleJobUrl:
    'https://career2.successfactors.eu/career?career_ns=job_listing&company=datalogics&navBarLevel=JOB_SEARCH&rcm_site_locale=en_US&career_job_req_id=11363&selected_lang=en_US&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta',
  companyDomain: 'datalogic.com',
  atsPlatform: 'successfactors',
  countryFilter: 'India',
  paginationStrategy: 'successfactors-next-page',
  extractionStrategy:
    'verified-first-party-careers-page+successfactors-public-search-results+india-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default DATALOGIC_INDIA_CATALOG
