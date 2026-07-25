export const SCIOMS_CATALOG = {
  source: 'sciomanagementsolutions',
  companyName: 'SCIO Management Solutions',
  officialBrandName: 'SCIO',
  companyCareerPage: 'https://www.scioms.com/careers.php',
  companyDomain: 'scioms.com',
  homepageUrl: 'https://www.scioms.com/',
  applyUrl: 'https://www.scioms.com/apply-now.php',
  adapter: 'script',
  atsPlatform: 'official-careers-shell-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-shell-validation',
  extractionStrategy: 'verified-first-party-careers-shell+apply-now-handoff+no-public-job-listings-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  modulePath: 'scraper/sciomanagementsolutions/script.js',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.scioms.com/careers.php presented the first-party SCIO careers shell with Apply Now navigation and recruiting copy, but no trustworthy public jobs surface or job detail records were exposed.',
}

export default SCIOMS_CATALOG
