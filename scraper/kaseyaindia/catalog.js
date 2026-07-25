export const KASEYA_INDIA_CATALOG = {
  source: 'kaseyaindia',
  companyName: 'Kaseya India',
  officialBrandName: 'Kaseya',
  adapter: 'script',
  modulePath: '../kaseyaindia/script.js',
  dryRunFile: 'kaseyaindia/jobs.json',
  homepageUrl: 'https://www.kaseya.com/careers/',
  companyCareerPage: 'https://www.kaseya.com/careers/jobs/',
  jobsSitemapUrl: 'https://www.kaseya.com/jobs-sitemap.xml',
  companyDomain: 'kaseya.com',
  verifiedSampleJobUrl: 'https://www.kaseya.com/careers/jobs/id/6015830004/',
  atsPlatform: 'official-company-careers-sitemap',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-page-plus-jobs-sitemap',
  extractionStrategy: 'verified-first-party-careers-page+jobs-sitemap+india-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that https://www.kaseya.com/careers/jobs/ is the live first-party Kaseya jobs page for the backlog row Kaseya India, that the page itself warns candidates to trust only @kaseya.com communications, that it explicitly advertises India hiring at the Bengaluru campus, and that the first-party sitemap https://www.kaseya.com/jobs-sitemap.xml publishes live job detail URLs. Verified that India detail pages such as https://www.kaseya.com/careers/jobs/id/6015830004/ resolve on the first-party domain and expose public job content for Pune, India, so this provider scrapes the trusted first-party jobs sitemap and filters to India roles only.',
}

export default KASEYA_INDIA_CATALOG
