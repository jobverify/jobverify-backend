import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const JOHNSON_CONTROLS_INDIA_CATALOG = {
  source: 'johnsoncontrolsindia',
  companyName: 'Johnson Controls India',
  officialBrandName: 'Johnson Controls',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  companyCareerPage:
    'https://jobs.johnsoncontrols.com/job-search?production_JCI_jobs%5BrefinementList%5D%5Blocations_list%5D%5B0%5D=India',
  algoliaSearchUrl: 'https://um59dwrpa1-1.algolianet.com/1/indexes/*/queries',
  algoliaApplicationId: 'UM59DWRPA1',
  algoliaApiKey: '33719eb8d9f28725f375583b7e78dbab',
  algoliaIndexName: 'production_JCI_jobs',
  atsPlatform: 'algolia',
  countryFilter: 'India',
  paginationStrategy: 'algolia-paged-search',
  extractionStrategy:
    'verified-first-party-job-search-page+algolia-jobs-index+official-detail-pages+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'johnsoncontrols.com',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that the official Johnson Controls public India search surface at https://jobs.johnsoncontrols.com/job-search?production_JCI_jobs%5BrefinementList%5D%5Blocations_list%5D%5B0%5D=India loads the public Algolia app UM59DWRPA1 and index production_JCI_jobs, and that the live India results include roles such as Technical Lead II and HR ServiceNow Developer with official detail pages on https://jobs.johnsoncontrols.com/job/WD30274611 and related WD requisition URLs.',
  dryRunFile: 'johnsoncontrolsindia/jobs.json',
}

export default JOHNSON_CONTROLS_INDIA_CATALOG
