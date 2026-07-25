export const SOPHOS_TECHNOLOGIES_CATALOG = {
  source: 'sophostechnologies',
  companyName: 'Sophos Technologies',
  officialBrandName: 'Sophos',
  adapter: 'script',
  modulePath: '../sophostechnologies/script.js',
  companyCareerPage: 'https://www.sophos.com/en-us/company/careers',
  companyDomain: 'sophos.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-careers-landing-only',
  extractionStrategy: 'verified-first-party-careers-landing+job-listings-cta-without-inline-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.sophos.com/en-us/company/careers is the live first-party Sophos careers landing page, that it still presents the Join the Sophos team recruiting copy and an Explore our job listings handoff CTA, and that the verified landing page itself does not expose an inline public openings list on the exact-name first-party surface.',
  dryRunFile: 'sophostechnologies/jobs.json',
}

export default SOPHOS_TECHNOLOGIES_CATALOG
