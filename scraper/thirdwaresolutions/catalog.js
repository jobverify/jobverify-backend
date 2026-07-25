export const THIRDWARE_SOLUTIONS_CATALOG = {
  source: 'thirdwaresolutions',
  companyName: 'Thirdware Solutions',
  officialBrandName: 'Thirdware',
  companyCareerPage: 'https://www.thirdware.com/',
  companyDomain: 'thirdware.com',
  homepageUrl: 'https://www.thirdware.com/',
  candidateRouteUrls: [
    'https://www.thirdware.com/',
    'https://www.thirdware.com/careers',
    'https://www.thirdware.com/careers/',
    'https://www.thirdware.com/jobs',
  ],
  adapter: 'script',
  atsPlatform: 'official-site-timeout-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-careers-route-timeout-validation',
  extractionStrategy: 'verified-first-party-route-timeouts+no-trustworthy-public-jobs-surface-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  modulePath: 'scraper/thirdwaresolutions/script.js',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that repeated probes to https://www.thirdware.com/ and adjacent first-party careers routes timed out from this environment, so no trustworthy public jobs surface was available to scrape.',
}

export default THIRDWARE_SOLUTIONS_CATALOG
