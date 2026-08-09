export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://eko.in/ is the live Eko Bharat Ventures Private Limited homepage, that it advertises https://about.eko.in/ as the corporate site, and that neither first-party homepage exposes a careers or jobs link or ATS handoff. Verified that https://eko.in/robots.txt and https://eko.in/sitemap.xml are live first-party crawl surfaces that do not advertise any careers route, that https://about.eko.in/robots.txt is live and disallows all crawling, that https://about.eko.in/sitemap.xml returned a first-party 404, and that common first-party jobs routes on both hosts such as /careers, /career, /jobs, /join-us, /work-with-us, and /openings returned first-party 404 pages. There is no trustworthy public jobs surface on Eko\'s verified first-party web properties.'

export const EKO_CATALOG = {
  source: 'eko',
  companyName: 'Eko',
  officialBrandName: 'Eko Bharat Ventures Private Limited',
  adapter: 'script',
  modulePath: '../../scraper/eko/script.js',
  companyCareerPage: 'https://eko.in/',
  companyDomain: 'eko.in',
  corporateHomepageUrl: 'https://about.eko.in/',
  robotsTxtUrl: 'https://eko.in/robots.txt',
  sitemapUrl: 'https://eko.in/sitemap.xml',
  corporateRobotsTxtUrl: 'https://about.eko.in/robots.txt',
  corporateSitemapUrl: 'https://about.eko.in/sitemap.xml',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-corporate-homepage-plus-crawl-surface-plus-common-careers-route-validation',
  extractionStrategy:
    'verified-homepage+verified-corporate-homepage+verified-crawl-surfaces-without-careers+verified-missing-common-careers-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default EKO_CATALOG

