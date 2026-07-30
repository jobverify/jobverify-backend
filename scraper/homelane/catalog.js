export const HOMELANE_CATALOG = {
  source: 'homelane',
  companyName: 'HomeLane',
  officialBrandName: 'HomeLane',
  adapter: 'script',
  companyCareerPage: 'https://sentinel.homelane.com/jobs',
  companyDomain: 'sentinel.homelane.com',
  atsPlatform: 'first-party-nextjs-jobs-index',
  countryFilter: 'India',
  paginationStrategy: 'single-server-rendered-jobs-index-plus-detail-pages',
  extractionStrategy: 'verified-first-party-jobs-index+server-rendered-role-cards+detail-page-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedPublicPostingCount: 15,
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://sentinel.homelane.com/jobs is the live first-party public HomeLane jobs index and that it server-renders 15 open roles with stable detail routes such as /jobs/HL_20. Verified those detail pages expose public role metadata and first-party apply links under /apply/<id>.',
  modulePath: '../homelane/script.js',
  dryRunFile: 'homelane/jobs.json',
}

export default HOMELANE_CATALOG
