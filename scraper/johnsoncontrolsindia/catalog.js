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
  algoliaSearchUrl: 'https://um59dwrpa1-dsn.algolia.net/1/indexes/*/queries',
  algoliaApplicationId: 'UM59DWRPA1',
  algoliaApiKey: '28f2dc2a092d52003624307b16ed44a5',
  algoliaIndexName: 'production_JCI_jobs',
  atsPlatform: 'algolia',
  countryFilter: 'India',
  paginationStrategy: 'algolia-paged-search',
  extractionStrategy:
    'verified-first-party-job-search-page+algolia-jobs-index+official-detail-pages+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'johnsoncontrols.com',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on Sunday, August 2, 2026 that the official Johnson Controls public India search surface at https://jobs.johnsoncontrols.com/job-search?production_JCI_jobs%5BrefinementList%5D%5Blocations_list%5D%5B0%5D=India still loads the public Algolia app UM59DWRPA1 and index production_JCI_jobs, but now authenticates through the dsn endpoint https://um59dwrpa1-dsn.algolia.net/1/indexes/*/queries with the rotated public search key 28f2dc2a092d52003624307b16ed44a5. Live India results included Sr. Project Engineer in Ahmedabad, Gujarat, India and other WD requisition detail pages on https://jobs.johnsoncontrols.com/job/.',
  dryRunFile: 'johnsoncontrolsindia/jobs.json',
}

export default JOHNSON_CONTROLS_INDIA_CATALOG
