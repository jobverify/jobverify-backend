import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://planful.com/jobs/ is the live first-party Planful careers landing page, that https://planful.com/jobs/careers-list/ is the live first-party careers list page, and that the public Greenhouse jobs API at https://boards-api.greenhouse.io/v1/boards/hostanalytics/jobs?content=true returned 8 public jobs including 1 India role. The current India posting is Senior NOC Engineer in Madhapur, Hyderabad, India at https://planful.com/jobs/careers-list/?gh_jid=8627819002, so this provider preserves the verified first-party detail URL while filtering the Greenhouse payload to India jobs.'

export const PLANFUL_CATALOG = {
  source: 'planful',
  companyName: 'Planful',
  officialBrandName: 'Planful',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'planful/jobs.json',
  companyCareerPage: 'https://planful.com/jobs/careers-list/',
  officialCareersLandingUrl: 'https://planful.com/jobs/',
  greenhouseJobsApiUrl: 'https://boards-api.greenhouse.io/v1/boards/hostanalytics/jobs',
  verifiedPublicJobCount: 8,
  verifiedIndiaJobCount: 1,
  verifiedSampleJobTitle: 'Senior NOC Engineer',
  verifiedSampleJobUrl: 'https://planful.com/jobs/careers-list/?gh_jid=8627819002',
  companyDomain: 'planful.com',
  atsPlatform: 'greenhouse',
  countryFilter: 'India',
  paginationStrategy: 'single-greenhouse-jobs-api-content-page',
  extractionStrategy:
    'verified-first-party-careers-pages+greenhouse-jobs-api+first-party-detail-url-preservation+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default PLANFUL_CATALOG
