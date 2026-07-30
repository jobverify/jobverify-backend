import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const TRIPADVISOR_CATALOG = {
  source: 'tripadvisor',
  companyName: 'Tripadvisor',
  adapter: 'script',
  companyCareerPage: 'https://careers.tripadvisor.com/',
  companyDomain: 'tripadvisor.com',
  officialJobsSurfaceUrl: 'https://job-boards.greenhouse.io/tripadvisor',
  atsPlatform: 'greenhouse-board-api',
  countryFilter: 'India',
  paginationStrategy: 'single-greenhouse-board-feed',
  extractionStrategy: 'verified-first-party-careers-page+official-greenhouse-board-api+india-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://careers.tripadvisor.com/ is Tripadvisor\'s live first-party careers homepage, that its Open positions link leads to https://careers.tripadvisor.com/departments, and that the public openings surface is the enumerable Tripadvisor Greenhouse board at https://job-boards.greenhouse.io/tripadvisor. The board exposed current openings on the verified date; this provider filters the official feed to India roles.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default TRIPADVISOR_CATALOG
