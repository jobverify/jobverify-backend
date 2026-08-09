import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const LINEAR_CATALOG = {
  source: 'linear',
  companyName: 'Linear',
  officialBrandName: 'Linear',
  adapter: 'script',
  companyCareerPage: 'https://linear.app/careers',
  companyDomain: 'linear.app',
  atsPlatform: 'official-first-party-careers-page',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-open-roles-page-current-empty-india-slice',
  extractionStrategy:
    'verified-first-party-open-roles-page+same-domain-role-links+return-empty-when-no-india-locations',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'linear/jobs.json',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://linear.app/careers was the live first-party Linear careers page, that it publicly exposed 20 open roles on same-domain /careers/{uuid} detail links, and that the visible location labels on the verified page covered Europe, North America, and London with zero India locations.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default LINEAR_CATALOG
