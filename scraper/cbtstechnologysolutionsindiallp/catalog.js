import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CBTS_TECHNOLOGY_SOLUTIONS_INDIA_LLP_CATALOG = {
  source: 'cbtstechnologysolutionsindiallp',
  companyName: 'CBTS TECHNOLOGY SOLUTIONS INDIA LLP',
  officialBrandName: 'CBTS India',
  adapter: 'script',
  homepageUrl: 'https://www.cbts.com/',
  companyCareerPage: 'https://www.cbts.com/careers',
  ripplingBoardUrl: 'https://ats.rippling.com/cbtsindia/jobs',
  ripplingBoardSlug: 'cbtsindia',
  atsPlatform: 'rippling',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-page-plus-rippling-next-data-pages',
  extractionStrategy: 'verified-first-party-careers-page+linked-rippling-board-next-data+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'cbts.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.cbts.com/careers is the live first-party CBTS careers page, that it explicitly advertises a CBTS India opportunity lane, and that the linked public board at https://ats.rippling.com/cbtsindia/jobs exposes current India roles in structured Rippling __NEXT_DATA__ payloads.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default CBTS_TECHNOLOGY_SOLUTIONS_INDIA_LLP_CATALOG
