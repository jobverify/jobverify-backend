import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const OUTLINE_SYSTEMS_CATALOG = {
  source: 'outlinesystems',
  companyName: 'Outline Systems',
  officialBrandName: 'Outline Systems',
  adapter: 'script',
  homepageUrl: 'https://www.outlinesys.com/',
  companyCareerPage: 'https://www.outlinesys.com/careers',
  companyDomain: 'outlinesys.com',
  atsPlatform: 'no-trustworthy-first-party-jobs-surface',
  countryFilter: 'India',
  paginationStrategy: 'empty-sentinel',
  extractionStrategy: 'no-verifiable-first-party-careers-surface-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that Outline Systems maps to the official domain outlinesys.com, but this sweep found no trustworthy public jobs surface at https://www.outlinesys.com/ or https://www.outlinesys.com/careers. With no verifiable first-party jobs page or ATS handoff, the local provider stays fail-closed and returns no jobs.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default OUTLINE_SYSTEMS_CATALOG
