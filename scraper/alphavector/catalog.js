export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://alphavector.co/ is the only live exact-name first-party domain candidate for Alphavector, but the homepage and common careers routes all serve the same first-party JavaScript redirect stub that sends visitors to /lander. https://alphavector.co/lander resolved onward to a GoDaddy for-sale page during live checks, https://alphavector.co/robots.txt is a minimal allow-all crawl file, and https://alphavector.co/sitemap.xml lists only https://alphavector.co/lander. There is no trustworthy public jobs surface: the verified first-party domain is a parked shell rather than a live company careers site or ATS handoff.'

export const ALPHAVECTOR_CATALOG = {
  source: 'alphavector',
  companyName: 'Alphavector',
  adapter: 'script',
  modulePath: '../alphavector/script.js',
  companyCareerPage: 'https://alphavector.co/',
  companyDomain: 'alphavector.co',
  robotsTxtUrl: 'https://alphavector.co/robots.txt',
  sitemapUrl: 'https://alphavector.co/sitemap.xml',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-parked-homepage-plus-sitemap-plus-common-careers-route-redirect-validation',
  extractionStrategy:
    'verified-parked-homepage+verified-robots-and-sitemap-with-single-lander-url+verified-common-careers-routes-share-parked-redirect-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default ALPHAVECTOR_CATALOG
