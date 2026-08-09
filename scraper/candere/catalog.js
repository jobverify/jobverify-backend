import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://www.candere.com/ is the first-party Candere by Kalyan Jewellers India surface and that its public careers handoff at https://candere.jobsoid.com/ currently says No Current Openings. This provider is pinned fail-closed and returns no jobs until the trusted surface exposes an enumerable India opening.'

export const CANDERE_CATALOG = {
  source: 'candere',
  companyName: 'Candere',
  officialBrandName: 'Candere by Kalyan Jewellers',
  adapter: 'script',
  companyCareerPage: 'https://candere.jobsoid.com/',
  companyDomain: 'candere.com',
  atsPlatform: 'jobsoid-no-current-openings-sentinel',
  countryFilter: 'India',
  paginationStrategy: 'single-jobsoid-board-validation',
  extractionStrategy: 'verified-first-party-careers-handoff-with-no-current-openings+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedPublicJobCount: 0,
  verifiedIndiaJobCount: 0,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'candere/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default CANDERE_CATALOG
