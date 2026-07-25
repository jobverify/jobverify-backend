export const IHCL_CATALOG = {
  source: 'ihcl',
  companyName: 'IHCL',
  adapter: 'script',
  modulePath: '../ihcl/script.js',
  companyCareerPage: 'https://careers.ihcltata.com/IHCL/search/?createNewAlert=false&q=',
  companyDomain: 'careers.ihcltata.com',
  atsPlatform: 'successfactors',
  countryFilter: 'India',
  paginationStrategy: 'startrow-query',
  extractionStrategy: 'successfactors-search-page+detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://careers.ihcltata.com/IHCL/search/?createNewAlert=false&q= is the live public SAP SuccessFactors jobs board for IHCL and currently shows 431 Jobs, including Housekeeping Executive in Kolkata and Duty Manager at Taj Hampi Resort & Spa, Karnataka. The public detail pages live under https://careers.ihcltata.com/IHCL/job/... with first-party talentcommunity apply handoffs.',
}

export default IHCL_CATALOG
