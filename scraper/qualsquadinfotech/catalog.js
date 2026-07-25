export const QUALSQUAD_INFOTECH_CATALOG = {
  source: 'qualsquadinfotech',
  companyName: 'Qualsquad Infotech',
  officialBrandName: 'Qualsquad Infotech',
  companyCareerPage: 'https://www.qualsquad.com/',
  companyDomain: 'qualsquad.com',
  candidateRouteUrls: [
    'https://www.qualsquad.com/',
    'https://www.qualsquadinfotech.com/',
    'https://qualsquadinfotech.com/',
  ],
  adapter: 'script',
  atsPlatform: 'official-site-unresolved-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'candidate-first-party-domain-resolution-validation',
  extractionStrategy: 'verified-unresolved-candidate-domains+no-trustworthy-public-jobs-surface-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  modulePath: 'scraper/qualsquadinfotech/script.js',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that candidate first-party Qualsquad domains either timed out or could not be resolved, including qualsquadinfotech.com, so no trustworthy public jobs surface was available to scrape.',
}

export default QUALSQUAD_INFOTECH_CATALOG
