export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.dentalkart.com/ is the live official Dentalkart homepage, https://www.dentalkart.com/about-us is the live first-party company page, https://www.dentalkart.com/careers resolves to a first-party Dentalkart shell with no public job records or ATS handoff, https://www.dentalkart.com/sitemap.xml is a live crawl surface that lists only site and product sitemaps, and https://www.dentalkart.com/career, https://www.dentalkart.com/jobs, https://www.dentalkart.com/openings, https://www.dentalkart.com/current-openings, https://www.dentalkart.com/join-us, and https://www.dentalkart.com/work-with-us all returned first-party 404 pages. There is no trustworthy public jobs surface.'

export const DENTALKART_CATALOG = {
  source: 'dentalkart',
  companyName: 'Dentalkart',
  adapter: 'script',
  modulePath: '../../scraper/dentalkart/script.js',
  companyCareerPage: 'https://www.dentalkart.com/careers',
  homepageUrl: 'https://www.dentalkart.com/',
  aboutPageUrl: 'https://www.dentalkart.com/about-us',
  companyDomain: 'dentalkart.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-about-page-plus-careers-shell-plus-common-route-validation',
  extractionStrategy:
    'verified-homepage+verified-about-page+verified-careers-shell-without-public-job-listings+verified-missing-common-job-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default DENTALKART_CATALOG

