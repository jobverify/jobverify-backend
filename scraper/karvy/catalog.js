export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that the exact-name Karvy domain at https://www.karvy.com/ is a Porkbun for-sale page rather than a live employer surface, that https://www.karvyonline.com/ resolves to unrelated contaminated content and is not a trustworthy first-party company site, and that https://www.karvyonline.com/join-us/career/ still shows stale resume-only copy instead of structured public job listings. There is no trustworthy public jobs surface for exact-name Karvy on the verified date.'

export const KARVY_CATALOG = {
  source: 'karvy',
  companyName: 'Karvy',
  officialBrandName: 'Karvy',
  adapter: 'script',
  modulePath: '../karvy/script.js',
  dryRunFile: 'karvy/jobs.json',
  homepageUrl: 'https://www.karvy.com/',
  parkedHomepageUrls: [
    'https://karvy.com/',
    'https://www.karvy.com/',
  ],
  legacyHomepageUrl: 'https://www.karvyonline.com/',
  companyCareerPage: 'https://www.karvyonline.com/join-us/career/',
  companyDomain: 'karvy.com',
  legacyCompanyDomain: 'karvyonline.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy:
    'parked-exact-domain-plus-untrustworthy-legacy-root-plus-stale-resume-page-validation',
  extractionStrategy:
    'verified-exact-name-domain-for-sale+verified-legacy-root-not-trustworthy+verified-stale-resume-only-career-page-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default KARVY_CATALOG
