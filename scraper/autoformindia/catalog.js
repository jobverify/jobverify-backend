export const VERIFIED_SURFACE_SUMMARY =
  'Verified October 27, 2026: https://www.autoform.com/en/ binds AutoForm Engineering to https://careers.autoform.com/en/ and https://careers.autoform.com/en/jobs/job-search/. Runtime reconciles advertised native listing channels, pagination and both first-party RSS feeds with full role details, native UID, formal requisition, employer, work countries and publication dates, then rechecks closing scope. Observed five native roles, four healthy; one native role has conflicting work countries and description text. Whole-company totals and India absence remain unknown while any scope or detail issue persists.'

export const AUTOFORM_INDIA_CATALOG = {
  source: 'autoformindia',
  companyName: 'AutoForm India',
  officialBrandName: 'AutoForm Engineering',
  adapter: 'script',
  modulePath: '../../scraper/autoformindia/script.js',
  companyCareerPage: 'https://careers.autoform.com/en/jobs/job-search/',
  homepageUrl: 'https://www.autoform.com/en/',
  careersHomeUrl: 'https://careers.autoform.com/en/',
  jobsLandingUrl: 'https://careers.autoform.com/en/jobs/',
  jobsRssUrl: 'https://careers.autoform.com/en/jobs.rss',
  companyDomain: 'autoform.com',
  atsPlatform: 'official-typo3-native-listing-rss-and-details',
  countryFilter: 'India',
  paginationStrategy: 'all-advertised-native-listing-pages-next-links-and-closing-recheck',
  extractionStrategy:
    'current-corporate-handoff+native-listing-rss-reconciliation+full-native-details+explicit-role-countries+closing-recheck',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-10-27',
  zeroResultPolicy: 'evidence-required',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default AUTOFORM_INDIA_CATALOG

