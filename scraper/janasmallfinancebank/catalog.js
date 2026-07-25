export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, July 16, 2026 that https://www.jana.bank.in/about-us/careers-hm/ is the live first-party Jana Small Finance Bank careers route, that it links to the official current openings surface at https://www.jana.bank.in/index.php/career/current-openings, and that the verified current openings page only instructs candidates to email careers@jana.bank.in with the job role in the subject line and exposes no trustworthy public job listings.'

export const JANA_SMALL_FINANCE_BANK_CATALOG = {
  source: 'janasmallfinancebank',
  companyName: 'Jana Small Finance Bank',
  officialBrandName: 'Jana Small Finance Bank',
  adapter: 'script',
  modulePath: '../janasmallfinancebank/script.js',
  homepageUrl: 'https://www.jana.bank.in/',
  companyCareerPage: 'https://www.jana.bank.in/about-us/careers-hm/',
  currentOpeningsPageUrl: 'https://www.jana.bank.in/index.php/career/current-openings',
  companyDomain: 'jana.bank.in',
  atsPlatform: 'official-company-site-no-trustworthy-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-careers-page-plus-current-openings-page-validation',
  extractionStrategy: 'verified-first-party-careers-surface-with-generic-email-handoff-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'janasmallfinancebank/jobs.json',
}

export default JANA_SMALL_FINANCE_BANK_CATALOG
