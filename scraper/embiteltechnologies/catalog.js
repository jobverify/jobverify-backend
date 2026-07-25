import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://embitel.sensehq.com/careers is the live public Embitel Technologies SenseHQ board and that it publicly exposed 11 open jobs, including Security Lead -Incident Management and Software Architect - Adaptive Autosar in Bangalore.'

export const EMBITEL_TECHNOLOGIES_CATALOG = {
  source: 'embiteltechnologies',
  companyName: 'Embitel Technologies',
  officialBrandName: 'Embitel Technologies India Pvt. Ltd.',
  adapter: 'script',
  homepageUrl: 'https://www.embitel.com/',
  companyCareerPage: 'https://embitel.sensehq.com/careers',
  publicBoardUrl: 'https://embitel.sensehq.com/careers',
  sampleJobUrl: 'https://embitel.sensehq.com/careers/jobs/55737',
  companyDomain: 'embitel.com',
  atsPlatform: 'sensehq',
  countryFilter: 'India',
  paginationStrategy: 'verified-public-sensehq-board-root-page-only',
  extractionStrategy: 'verified-sensehq-next-data-board+india-openings-only',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicOpeningCount: 11,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'embiteltechnologies/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default EMBITEL_TECHNOLOGIES_CATALOG
