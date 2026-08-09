import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://dagster.io/careers redirects to the live official Dagster careers page at https://dagster.io/company/careers, where the Open Roles section states "We\'re not currently hiring, but check back soon!", and that the linked public Greenhouse board at https://job-boards.greenhouse.io/dagsterlabs states "There are no current openings." Dagster therefore has a trustworthy first-party public jobs surface on the verified date, but it is currently empty, so this provider returns an honest empty result until that verified surface changes.'

export const DAGSTER_CATALOG = {
  source: 'dagster',
  companyName: 'Dagster',
  officialBrandName: 'Dagster Labs',
  adapter: 'script',
  companyCareerPage: 'https://dagster.io/company/careers',
  greenhouseBoardUrl: 'https://job-boards.greenhouse.io/dagsterlabs',
  companyDomain: 'dagster.io',
  verifiedPublicJobCount: 0,
  verifiedIndiaJobCount: 0,
  atsPlatform: 'greenhouse-empty-board',
  countryFilter: 'India',
  paginationStrategy: 'single-official-careers-page-plus-empty-greenhouse-board',
  extractionStrategy:
    'verified-first-party-careers-page+verified-empty-greenhouse-board+return-empty-until-board-changes',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'dagster/jobs.json',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default DAGSTER_CATALOG
