export const SCIOMS_CATALOG = {
  source: 'sciomanagementsolutions',
  companyName: 'SCIO Management Solutions',
  officialBrandName: 'SCIO',
  companyCareerPage: 'https://www.scioms.com/careers.php',
  companyDomain: 'scioms.com',
  homepageUrl: 'https://www.scioms.com/',
  applyUrl: 'https://www.scioms.com/apply-now',
  adapter: 'script',
  atsPlatform: 'official-careers-shell-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-shell-validation',
  extractionStrategy: 'verified-first-party-careers-shell+apply-now-placeholder-validation+browser-fallback-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  modulePath: 'scraper/sciomanagementsolutions/script.js',
  verifiedOn: '2026-08-04',
  verifiedSurfaceSummary:
    'Verified on Tuesday, August 4, 2026 that https://www.scioms.com/careers.php and https://www.scioms.com/apply-now render the current first-party SCIO careers shell with Life at SCIO / Current Openings navigation and an Apply Now resume form, but the position selector remains an empty placeholder and no trustworthy public job detail surface is exposed.',
}

export default SCIOMS_CATALOG
