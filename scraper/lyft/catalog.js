import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const LYFT_CATALOG = {
  source: 'lyft',
  companyName: 'Lyft',
  officialBrandName: 'Lyft, Inc.',
  adapter: 'script',
  companyCareerPage: 'https://www.lyft.com/careers',
  greenhouseJobsApiUrl: 'https://api.greenhouse.io/v1/boards/lyft/jobs',
  greenhouseJobsApiWithContentUrl: 'https://api.greenhouse.io/v1/boards/lyft/jobs?content=true',
  atsPlatform: 'greenhouse',
  countryFilter: 'India',
  paginationStrategy: 'single-greenhouse-jobs-api-content-page',
  extractionStrategy: 'verified-first-party-careers-shell+verified-greenhouse-jobs-api+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'lyft.com',
  dryRunFile: 'lyft/jobs.json',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that https://www.lyft.com/careers is the current first-party Lyft careers surface, rendering the "WORKING AT LYFT" shell with the "Search job openings" and "See open jobs" handoff plus a Careers search component anchored at referenceId openings. The live public jobs payload is exposed at https://api.greenhouse.io/v1/boards/lyft/jobs?content=true, which returned 159 public roles on the verified date, with leading locations including San Francisco, CA, Toronto, Canada, and New York, NY. That verified payload exposed 0 India-facing roles on Thursday, July 16, 2026, and current public detail URLs resolve through app.careerpuck.com for Lyft job applications.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default LYFT_CATALOG
