export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Monday, August 3, 2026 that https://www.kvb.bank.in/ links to the first-party careers host at https://careers.karurvysya.bank.in, that the careers shell at https://careers.karurvysya.bank.in/karurvysyabank/jobslist still resolves with the Karur Vysya Bank Zwayam app shell, that the public Zwayam company configuration endpoint at https://public.zwayam.com/data-service/v2/company/15551/careersite-configurations resolves to Karur Vysya Bank under reponseObject.company with careerSiteUrl careers.karurvysya.bank.in, and that the first-party search contract at https://public.zwayam.com/manageESQueries/searchJob now returns 49 live jobs including https://careers.karurvysya.bank.in/karurvysyabank/jobview/product-mgr-prod-partnership-all-branches-2025062618181035.'

export const KARUR_VYSYA_BANK_CATALOG = {
  source: 'karurvysyabank',
  companyName: 'Karur Vysya Bank',
  officialBrandName: 'Karur Vysya Bank',
  adapter: 'script',
  modulePath: '../karurvysyabank/script.js',
  dryRunFile: 'karurvysyabank/jobs.json',
  homepageUrl: 'https://www.kvb.bank.in/',
  careersLandingUrl: 'https://careers.karurvysya.bank.in/karurvysyabank/',
  companyCareerPage: 'https://careers.karurvysya.bank.in/karurvysyabank/jobslist',
  companyDomain: 'careers.karurvysya.bank.in',
  zwayamCompanyConfigurationUrl:
    'https://public.zwayam.com/data-service/v2/company/15551/careersite-configurations',
  zwayamSearchApiUrl: 'https://public.zwayam.com/manageESQueries/searchJob',
  zwayamCompanyId: 'MTU1NTE=',
  zwayamDetailCompanyId: '15551',
  verifiedSampleJobUrl:
    'https://careers.karurvysya.bank.in/karurvysyabank/jobview/product-mgr-prod-partnership-all-branches-2025062618181035',
  atsPlatform: 'zwayam',
  countryFilter: 'India',
  paginationStrategy: 'public-zwayam-manageesqueries-searchjob',
  extractionStrategy:
    'verified-first-party-homepage+verified-first-party-zwayam-careers-shell+verified-public-zwayam-company-config+public-zwayam-manageesqueries-searchjob',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-03',
  verifiedPublicPostingCount: 49,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default KARUR_VYSYA_BANK_CATALOG
