import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const BUILDKITE_CATALOG = {
  source: 'buildkite',
  companyName: 'Buildkite',
  officialBrandName: 'Buildkite',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'buildkite/jobs.json',
  companyCareerPage: 'https://buildkite.com/about/careers/',
  greenhouseBoardUrl: 'https://job-boards.greenhouse.io/buildkite',
  greenhouseJobsApiUrl: 'https://boards-api.greenhouse.io/v1/boards/buildkite/jobs',
  companyDomain: 'buildkite.com',
  verifiedPublicJobCount: 10,
  verifiedIndiaJobCount: 0,
  atsPlatform: 'greenhouse',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-public-greenhouse-board',
  extractionStrategy: 'verified-first-party-careers-page+public-greenhouse-jobs-api+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://buildkite.com/about/careers/ was the live first-party Buildkite careers page with the Work at Buildkite heading, Open roles section, and Join talent community handoff, and that Buildkite\'s public Greenhouse board was live at https://job-boards.greenhouse.io/buildkite. The public Greenhouse feed at https://boards-api.greenhouse.io/v1/boards/buildkite/jobs?content=true returned 10 live roles on the verified date, including Staff Developer Advocate (USA - Pacific Time), Principal Engineer - Data (ANZ Region), and Account Executive (United States), with zero India locations. No India roles were present in the verified public feed, so this provider currently returns an honest empty India slice while the trusted public surface remains unchanged.',
}

export default BUILDKITE_CATALOG
