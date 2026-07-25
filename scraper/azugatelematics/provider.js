export const provider = {
  source: 'azugatelematics',
  companyName: 'Azuga Telematics',
  adapter: 'script',
  modulePath: '../azugatelematics/script.js',
  companyCareerPage: 'https://www.azuga.com/careers',
  atsPlatform: 'official-company-site-no-open-roles',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-page-validation',
  extractionStrategy: 'verified-first-party-careers-page+no-items-found+parent-company-careers-handoff',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'azuga.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.azuga.com/careers remained the official Azuga careers page, displayed the message No items found., and linked the company careers handoff to www.bebridgestone.com rather than exposing an Azuga-hosted public openings list.',
  dryRunFile: 'azugatelematics/jobs.json',
}

export default provider
