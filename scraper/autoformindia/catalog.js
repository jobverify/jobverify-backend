export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.autoform.com/ resolves to AutoForm Engineering\'s live official homepage at https://www.autoform.com/en/, that the homepage links candidates to the first-party careers site at https://careers.autoform.com/en/, and that https://careers.autoform.com/en/jobs/job-search/ exposes a public India location filter plus the first-party RSS feed at https://careers.autoform.com/en/jobs.rss. The verified search/feed surface currently lists openings in Europe, Switzerland, China, Mexico, and France but no India roles live right now for AutoForm India.'

export const AUTOFORM_INDIA_CATALOG = {
  source: 'autoformindia',
  companyName: 'AutoForm India',
  officialBrandName: 'AutoForm Engineering',
  adapter: 'script',
  modulePath: '../autoformindia/script.js',
  companyCareerPage: 'https://careers.autoform.com/en/jobs/job-search/',
  homepageUrl: 'https://www.autoform.com/en/',
  careersHomeUrl: 'https://careers.autoform.com/en/',
  jobsLandingUrl: 'https://careers.autoform.com/en/jobs/',
  jobsRssUrl: 'https://careers.autoform.com/en/jobs.rss',
  companyDomain: 'autoform.com',
  atsPlatform: 'official-company-careers-rss-feed',
  countryFilter: 'India',
  paginationStrategy: 'official-homepage-plus-first-party-careers-home-plus-job-search-plus-rss-feed',
  extractionStrategy:
    'verified-official-homepage+verified-first-party-careers-home+verified-job-search+first-party-rss-feed+india-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default AUTOFORM_INDIA_CATALOG
