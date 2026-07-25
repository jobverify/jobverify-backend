export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://www.kvb.bank.in/ links to the first-party careers shell at https://careers.karurvysya.bank.in/karurvysyabank/jobslist, that the public Zwayam company configuration endpoint at https://public.zwayam.com/data-service/v2/company/15551/careersite-configurations resolves to Karur Vysya Bank with careerSiteUrl careers.karurvysya.bank.in, and that the first-party app-backed search contract at https://public.zwayam.com/manageESQueries/searchJob returned live jobs including https://careers.karurvysya.bank.in/karurvysyabank/jobview/bus-dev-executive-bc-chennai-tamil-nadu-india-2025071615352836.'

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
    'https://careers.karurvysya.bank.in/karurvysyabank/jobview/bus-dev-executive-bc-chennai-tamil-nadu-india-2025071615352836',
  atsPlatform: 'zwayam',
  countryFilter: 'India',
  paginationStrategy: 'public-zwayam-manageesqueries-searchjob',
  extractionStrategy:
    'verified-first-party-homepage+verified-first-party-zwayam-careers-shell+verified-public-zwayam-company-config+public-zwayam-manageesqueries-searchjob',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default KARUR_VYSYA_BANK_CATALOG
