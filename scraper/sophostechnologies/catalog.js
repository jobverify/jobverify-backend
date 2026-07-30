export const SOPHOS_TECHNOLOGIES_CATALOG = {
  source: 'sophostechnologies',
  companyName: 'Sophos Technologies',
  officialBrandName: 'Sophos',
  adapter: 'script',
  modulePath: '../sophostechnologies/script.js',
  companyCareerPage: 'https://www.sophos.com/en-us/company/careers',
  companyDomain: 'sophos.com',
  leverBoardUrl: 'https://jobs.lever.co/sophos',
  leverPostingsApiUrl: 'https://api.lever.co/v0/postings/sophos',
  atsPlatform: 'lever',
  countryFilter: 'India',
  paginationStrategy: 'lever-skip-limit-until-short-page',
  extractionStrategy:
    'verified-first-party-careers-handoff+official-lever-postings-api+india-country-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-23',
  verifiedSurfaceSummary:
    'Verified on July 23, 2026 that https://www.sophos.com/en-us/company/careers is the live first-party Sophos careers page and its Explore our job listings action links directly to the official public board at https://jobs.lever.co/sophos. The scraper uses Lever public Postings API pagination at https://api.lever.co/v0/postings/sophos with mode=json, limit, and skip parameters so postings beyond the first 100 are included before filtering country and location fields to India.',
  dryRunFile: 'sophostechnologies/jobs.json',
}

export default SOPHOS_TECHNOLOGIES_CATALOG
