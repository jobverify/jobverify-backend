export const PORTER_CATALOG = {
  source: 'porter',
  companyName: 'Porter',
  officialBrandName: 'Porter',
  adapter: 'script',
  modulePath: '../../scraper/porter/script.js',
  companyCareerPage: 'https://porter.in/careers',
  companyDomain: 'porter.in',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'browser-session-darwinbox-pagination',
  extractionStrategy: 'official-careers-page+darwinbox-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  officialCareersHandoffUrl: 'https://porter.darwinbox.in/ms/candidate/careers',
  darwinboxOrigin: 'https://porter.darwinbox.in',
  darwinboxCompanyId: 'main',
  dryRunFile: 'porter/jobs.json',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that https://porter.in/careers is the live first-party Porter careers page and that its SEE OPEN POSITIONS call-to-action hands job seekers to the official Darwinbox candidate portal at https://porter.darwinbox.in/ms/candidate/careers.',
}

export default PORTER_CATALOG

