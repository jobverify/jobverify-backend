export const IGT_SOLUTIONS_CATALOG = {
  source: 'igtsolutions',
  companyName: 'IGT Solutions',
  adapter: 'script',
  modulePath: '../igtsolutions/script.js',
  companyCareerPage: 'https://www.igtsolutions.com/careers/',
  companyDomain: 'igtsolutions.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-careers-page-plus-join-form-and-legacy-board-unavailable-validation',
  extractionStrategy: 'verified-careers-page+verified-join-form+verified-legacy-board-unavailable-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://www.igtsolutions.com/careers/ is the live first-party IGT Solutions careers route, that the page canonicalizes to https://atain.com/careers/ after the Atain rebrand, and that its only recruiting CTA is the first-party join form at https://atain.com/join-the-squad/. The legacy public ATS hosts at https://careers.igtsolutions.com/ and https://careers.igtsolutions.com/go/India/8956655/ both returned 403 Forbidden during live checks, so there is no trustworthy public jobs surface.',
}

export default IGT_SOLUTIONS_CATALOG
