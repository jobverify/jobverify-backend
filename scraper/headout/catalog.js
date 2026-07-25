export const HEADOUT_CATALOG = {
  source: 'headout',
  companyName: 'Headout',
  officialBrandName: 'Headout',
  adapter: 'script',
  modulePath: '../headout/script.js',
  companyCareerPage: 'https://www.headout.com/careers/',
  companyDomain: 'headout.com',
  atsPlatform: 'greenhouse',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-page-plus-multi-board-greenhouse-jobs-api',
  extractionStrategy:
    'verified-first-party-careers-page+verified-open-roles-loader+multi-board-greenhouse-jobs-api+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  greenhouseBoardSlugs: ['headoutcareers', 'headoutreferrals'],
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://www.headout.com/careers/ is the live first-party Headout careers page, that its first-party open-roles loader script fetches Greenhouse data for the public boards headoutcareers and headoutreferrals, and that the live Greenhouse jobs API currently exposes India roles including Software Engineer, Apps in Bengaluru and Photo Editor (Remote) in Remote (India).',
  dryRunFile: 'headout/jobs.json',
}

export default HEADOUT_CATALOG
