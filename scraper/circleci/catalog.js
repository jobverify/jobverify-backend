import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CIRCLECI_CATALOG = {
  source: 'circleci',
  companyName: 'CircleCI',
  officialBrandName: 'CircleCI',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'circleci/jobs.json',
  companyCareerPage: 'https://circleci.com/careers/jobs/',
  companyDomain: 'circleci.com',
  atsPlatform: 'official-first-party-careers-page',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-open-roles-page-current-empty-india-slice',
  extractionStrategy:
    'verified-first-party-open-roles-page+same-domain-role-links+return-empty-when-no-india-locations',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://circleci.com/careers/jobs/ was the live first-party CircleCI careers page, that it publicly exposed 9 public openings on same-domain /careers/jobs/ detail links, and that the visible office and role labels covered London, Mexico City, Remote (Canada), San Francisco, and Toronto with zero India locations.',
}

export default CIRCLECI_CATALOG
