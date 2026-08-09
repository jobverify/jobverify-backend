export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://aktek.io/ is the live official AKTEK homepage, that https://aktek.io/robots.txt and https://aktek.io/sitemap.xml are the live first-party crawl surfaces, and that https://aktek.io/page-sitemap.xml lists product, policy, conference, and about pages but no careers or jobs page. There is no trustworthy public jobs surface: common first-party careers routes such as https://aktek.io/careers, https://aktek.io/career, https://aktek.io/jobs, https://aktek.io/join-us, https://aktek.io/work-with-us, https://aktek.io/openings, and https://aktek.io/current-openings all returned first-party 404 pages during live checks, and the verified homepage exposed no first-party careers link or public ATS handoff.'

export const AKTEK_CATALOG = {
  source: 'aktek',
  companyName: 'Aktek',
  adapter: 'script',
  modulePath: '../../scraper/aktek/script.js',
  companyCareerPage: 'https://aktek.io/',
  companyDomain: 'aktek.io',
  robotsTxtUrl: 'https://aktek.io/robots.txt',
  sitemapIndexUrl: 'https://aktek.io/sitemap.xml',
  pageSitemapUrl: 'https://aktek.io/page-sitemap.xml',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-crawl-surface-plus-common-careers-route-404-validation',
  extractionStrategy:
    'verified-homepage+verified-robots-and-page-sitemap-without-careers-url+verified-missing-common-careers-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default AKTEK_CATALOG

