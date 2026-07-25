import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that the live public ReNew jobs surface remains the first-party ' +
  'SuccessFactors site at https://careers.renew.com/ and its pinned search route ' +
  'https://careers.renew.com/search/?createNewAlert=false&q=&locationsearch=, which still renders ' +
  'ReNew-branded search results and first-party detail/apply pages.'

export const RENEW_CATALOG = {
  source: 'renew',
  companyName: 'ReNew',
  officialBrandName: 'ReNew Power',
  adapter: 'script',
  dryRunFile: 'renew/jobs.json',
  companyCareerPage: 'https://careers.renew.com/',
  verifiedJobsSearchUrl: 'https://careers.renew.com/search/?createNewAlert=false&q=&locationsearch=',
  atsPlatform: 'successfactors',
  countryFilter: 'India',
  paginationStrategy: 'startrow-query',
  extractionStrategy: 'verified-renew-jobs-page+successfactors-search-page+detail-pages+filled-role-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'careers.renew.com',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  modulePath: path.join(currentDir, 'script.js'),
}

export default RENEW_CATALOG
