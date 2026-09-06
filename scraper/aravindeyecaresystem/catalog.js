export const VERIFIED_SURFACE_SUMMARY =
  'Verified on September 3, 2026 that https://aravind.org/ remains the live official Aravind Eye Care System homepage, that https://aravind.org/careers/ remains the first-party careers page, and that the active WordPress sitemap index is https://aravind.org/wp-sitemap.xml. The careers page continues to expose first-party WP Job Manager feeds at https://aravind.org/jm-ajax/get_listings/ and https://aravind.org/wp-json/wp/v2/job-listings. Those public feeds currently return no live listings, so the scraper treats the verified empty feed state as zero open roles instead of a surface failure.'

export const ARAVIND_EYE_CARE_SYSTEM_CATALOG = {
  source: 'aravindeyecaresystem',
  companyName: 'Aravind Eye Care System',
  adapter: 'script',
  modulePath: '../../scraper/aravindeyecaresystem/script.js',
  companyCareerPage: 'https://aravind.org/careers/',
  homepageUrl: 'https://aravind.org/',
  pageSitemapUrl: 'https://aravind.org/wp-sitemap.xml',
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
  verifiedOn: '2026-09-03',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default ARAVIND_EYE_CARE_SYSTEM_CATALOG

