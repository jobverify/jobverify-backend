export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://aravind.org/ is the live official Aravind Eye Care System homepage, that https://aravind.org/careers/ is the first-party careers page published in https://aravind.org/page-sitemap.xml, and that the careers page exposes first-party WP Job Manager feeds at https://aravind.org/jm-ajax/get_listings/ and https://aravind.org/wp-json/wp/v2/job-listings. Those first-party public feeds returned the live postings Driver, AC Mechanic, and Data Engineering JD during verification.'

export const ARAVIND_EYE_CARE_SYSTEM_CATALOG = {
  source: 'aravindeyecaresystem',
  companyName: 'Aravind Eye Care System',
  adapter: 'script',
  modulePath: '../aravindeyecaresystem/script.js',
  companyCareerPage: 'https://aravind.org/careers/',
  homepageUrl: 'https://aravind.org/',
  pageSitemapUrl: 'https://aravind.org/page-sitemap.xml',
  jobListingsAjaxUrl: 'https://aravind.org/jm-ajax/get_listings/',
  jobListingsApiUrl: 'https://aravind.org/wp-json/wp/v2/job-listings',
  companyDomain: 'aravind.org',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'official-homepage-plus-careers-page-plus-wp-job-manager-first-party-feeds',
  extractionStrategy:
    'official-homepage+official-careers-page+page-sitemap+wp-job-manager-ajax-feed+wp-rest-job-listings',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default ARAVIND_EYE_CARE_SYSTEM_CATALOG
