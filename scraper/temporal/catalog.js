import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TEMPORAL_CATALOG = {
  source: 'temporal',
  companyName: 'Temporal',
  officialBrandName: 'Temporal',
  adapter: 'script',
  companyCareerPage: 'https://temporal.io/about',
  greenhouseBoardUrl: 'https://job-boards.greenhouse.io/temporaltechnologies',
  greenhouseJobsApiUrl: 'https://boards-api.greenhouse.io/v1/boards/temporaltechnologies/jobs',
  companyDomain: 'temporal.io',
  officialJobBoardDomain: 'job-boards.greenhouse.io',
  atsPlatform: 'greenhouse-board-api',
  countryFilter: 'India',
  paginationStrategy: 'single-greenhouse-board-feed',
  extractionStrategy:
    'verified-first-party-about-page+official-greenhouse-board+official-greenhouse-board-api+india-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://temporal.io/about was the live first-party Temporal about page, that its Join Now and View All Openings links handed candidates to the official Greenhouse board at https://job-boards.greenhouse.io/temporaltechnologies, and that the companion public Greenhouse API feed at https://boards-api.greenhouse.io/v1/boards/temporaltechnologies/jobs?content=true was live. The verified feed exposed the India role Events & Field Marketing Manager - India on the verified date.',
  dryRunFile: 'temporal/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default TEMPORAL_CATALOG
