import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const RIVIGO_CATALOG = {
  source: 'rivigo',
  companyName: 'Rivigo',
  officialBrandName: 'Rivigo',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  homepageUrl: 'https://www.rivigo.com/',
  companyCareerPage: 'https://careers-rivigo.flexiele.com/',
  officialFirstPartyJobsUrl: 'https://careers-rivigo.flexiele.com/',
  atsPlatform: 'official-company-careers-no-trustworthy-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'single-empty-board-validation',
  extractionStrategy: 'verified-first-party-empty-careers-board-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'rivigo.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://careers-rivigo.flexiele.com/ is the branded first-party Rivigo public careers board linked back to rivigo.com, and that the verified board currently says No Requsitions Found with Job Openings 0 - 0 of 0. There is no trustworthy public jobs surface to extract until the official Rivigo board exposes real openings again.',
  dryRunFile: 'rivigo/jobs.json',
}

export default RIVIGO_CATALOG
