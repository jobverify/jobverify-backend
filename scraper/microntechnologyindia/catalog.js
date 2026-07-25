import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MICRON_TECHNOLOGY_INDIA_CATALOG = {
  source: 'microntechnologyindia',
  companyName: 'Micron Technology India',
  officialBrandName: 'Micron Technology',
  adapter: 'script',
  homepageUrl: 'https://in.micron.com/',
  companyCareerPage: 'https://in.micron.com/about/careers',
  publicBoardUrl: 'https://careers.micron.com/careers?domain=micron.com&pid=25253497&sort_by=relevance',
  listingApiUrl: 'https://careers.micron.com/api/pcsx/search',
  detailApiUrlTemplate:
    'https://careers.micron.com/api/pcsx/position_details?position_id={{jobId}}&domain=micron.com&hl=en',
  apiQuery: {
    domain: 'micron.com',
    query: '',
    location: 'India',
  },
  companyDomain: 'micron.com',
  atsPlatform: 'eightfold',
  countryFilter: 'India',
  paginationStrategy: 'verified-india-careers-page-plus-public-eightfold-search-pagination',
  extractionStrategy: 'verified-india-careers-page+eightfold-search-api+detail-api+india-openings-only',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that https://in.micron.com/about/careers is the live first-party Micron India careers page and that it exposes "Search current jobs" links to https://careers.micron.com/careers?domain=micron.com&pid=25253497&sort_by=relevance. Verified that the public Eightfold search API at https://careers.micron.com/api/pcsx/search?domain=micron.com&query=&location=India&start=0&limit=10 returned live India openings including "Principal Engineer- HIG HBM Layout" in Hyderabad, Telangana, India.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default MICRON_TECHNOLOGY_INDIA_CATALOG
