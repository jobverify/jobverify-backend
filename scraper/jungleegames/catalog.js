export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, July 16, 2026 that https://www.jungleegames.com/ and https://www.jungleegames.com/grow.php are the live first-party Junglee Games public careers surfaces, and that the directly verified listing page https://www.jungleegames.com/grow-inner-page.php?id=56613313BB exposed "No Open Roles In This Department". While some orphaned grow-inner-page URLs remain publicly reachable, the live verified first-party grow surfaces exposed no trustworthy current jobs index on July 16, 2026.'

export const JUNGLEE_GAMES_CATALOG = {
  source: 'jungleegames',
  companyName: 'Junglee Games',
  officialBrandName: 'Junglee Games',
  adapter: 'script',
  modulePath: '../jungleegames/script.js',
  homepageUrl: 'https://www.jungleegames.com/',
  companyCareerPage: 'https://www.jungleegames.com/grow.php',
  verifiedEmptyDepartmentPageUrl: 'https://www.jungleegames.com/grow-inner-page.php?id=56613313BB',
  companyDomain: 'jungleegames.com',
  atsPlatform: 'official-company-site-no-trustworthy-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-grow-page-plus-empty-department-page-validation',
  extractionStrategy: 'verified-first-party-grow-surface-without-trustworthy-current-jobs-index-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'jungleegames/jobs.json',
}

export default JUNGLEE_GAMES_CATALOG
