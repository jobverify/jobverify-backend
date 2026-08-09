export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.avenuesupermarts.com/ is a lightweight corporate redirect shell to https://www.avenuesupermarts.com/lander, and that https://www.dmartindia.com/careers is the live first-party DMart careers page. During live rendering, the first-party careers page exposed the public SuccessFactors board at https://career10.successfactors.com/career?company=avenuesupe, and the public search surface at https://career10.successfactors.com/career?company=avenuesupe&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH& displayed "24 Jobs match the selections". A live public detail page was also verified at https://career10.successfactors.com/career?career_ns=job_listing&company=avenuesupe&navBarLevel=JOB_SEARCH&rcm_site_locale=en_GB&career_job_req_id=110923&selected_lang=en_GB&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta for PURCHASE OFFICERS in Bangalore, Karnataka.'

export const AVENUE_SUPERMARTS_CATALOG = {
  source: 'avenuesupermarts',
  companyName: 'Avenue Supermarts',
  adapter: 'script',
  modulePath: '../../scraper/avenuesupermarts/script.js',
  companyCareerPage: 'https://www.dmartindia.com/careers',
  homepageUrl: 'https://www.dmartindia.com/',
  corporateHomepageUrl: 'https://www.avenuesupermarts.com/',
  corporateLanderUrl: 'https://www.avenuesupermarts.com/lander',
  successFactorsCompanyToken: 'avenuesupe',
  successFactorsBoardUrl: 'https://career10.successfactors.com/career?company=avenuesupe',
  successFactorsSearchUrl: 'https://career10.successfactors.com/career?company=avenuesupe&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH&',
  verifiedSampleJobUrl: 'https://career10.successfactors.com/career?career_ns=job_listing&company=avenuesupe&navBarLevel=JOB_SEARCH&rcm_site_locale=en_GB&career_job_req_id=110923&selected_lang=en_GB&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta',
  companyDomain: 'dmartindia.com',
  atsPlatform: 'successfactors',
  countryFilter: 'India',
  paginationStrategy: 'successfactors-next-page',
  extractionStrategy:
    'verified-first-party-dmart-careers-page+successfactors-public-search-results+detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default AVENUE_SUPERMARTS_CATALOG

