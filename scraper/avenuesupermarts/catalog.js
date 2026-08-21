export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, August 13, 2026 that https://www.avenuesupermarts.com/ is still a lightweight corporate redirect shell to https://www.avenuesupermarts.com/lander, and that https://www.dmartindia.com/careers is the live first-party DMart careers page. The public search surface at https://career10.successfactors.com/career?company=avenuesupe&career_ns=job_listing_summary&navBarLevel=JOB_SEARCH& now boots through the public SuccessFactors DWR contract and returned 30 India postings, including EXECUTIVE PURCHASE and EXECUTIVE FLOOR_CORE FMCG FOOD. A live public detail page was also verified at https://career10.successfactors.com/career?career_ns=job_listing&company=avenuesupe&navBarLevel=JOB_SEARCH&rcm_site_locale=en_GB&career_job_req_id=109412&selected_lang=en_GB&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta for EXECUTIVE PURCHASE in Bangalore, Karnataka.'

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
  verifiedSampleJobUrl: 'https://career10.successfactors.com/career?career_ns=job_listing&company=avenuesupe&navBarLevel=JOB_SEARCH&rcm_site_locale=en_GB&career_job_req_id=109412&selected_lang=en_GB&jobAlertController_jobAlertId=&jobAlertController_jobAlertName=&browserTimeZone=Asia/Calcutta',
  companyDomain: 'dmartindia.com',
  atsPlatform: 'successfactors',
  countryFilter: 'India',
  paginationStrategy: 'successfactors-dwr-initial-search',
  extractionStrategy:
    'verified-first-party-dmart-careers-page+successfactors-bootstrap+dwr-search-results+detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-13',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default AVENUE_SUPERMARTS_CATALOG
