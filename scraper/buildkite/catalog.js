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
  verifiedPublicJobCount: 11,
  verifiedIndiaJobCount: 0,
  atsPlatform: 'greenhouse',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-public-greenhouse-board',
  extractionStrategy: 'verified-first-party-careers-page+public-greenhouse-jobs-api+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-13',
  verifiedSurfaceSummary:
    'Verified on Thursday, August 13, 2026 that https://buildkite.com/about/careers/ was the live first-party Buildkite careers page with the current "Work at Buildkite | Remote-first careers | Buildkite" title, the Work at Buildkite heading, the Open roles section, and the Join our talent community handoff, and that Buildkite\'s public Greenhouse board was live at https://job-boards.greenhouse.io/buildkite. The public Greenhouse feed at https://boards-api.greenhouse.io/v1/boards/buildkite/jobs?content=true returned 11 live roles on the verified date, including Account Executive (United States), Developer Events Lead (San Francisco), and Principal Engineer - Data (ANZ Region), with zero India locations. No India roles were present in the verified public feed, so this provider currently returns an honest empty India slice while the trusted public surface remains unchanged.',
}

export default BUILDKITE_CATALOG
