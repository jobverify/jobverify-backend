export const VERIFIED_SURFACE_SUMMARY =
  'Verified on August 2, 2026 that the exact-name Karvy domain at https://www.karvy.com/ no longer serves a public employer surface and instead returns a non-job 403 response, that https://www.karvyonline.com/ is a live first-party Karvy Online financial-services site with a Join Us careers handoff to https://www.karvyonline.com/join-us/career/, and that the linked career page still shows stale resume-only copy instead of structured public job listings. There is no trustworthy public jobs surface for exact-name Karvy on the verified date.'

export const KARVY_CATALOG = {
  source: 'karvy',
  companyName: 'Karvy',
  officialBrandName: 'Karvy',
  adapter: 'script',
  modulePath: '../../scraper/karvy/script.js',
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
    'inactive-exact-domain-plus-first-party-legacy-root-handoff-plus-stale-resume-page-validation',
  extractionStrategy:
    'verified-exact-name-domain-not-jobs+verified-first-party-legacy-root-handoff+verified-stale-resume-only-career-page-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default KARVY_CATALOG

