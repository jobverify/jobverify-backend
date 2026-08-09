import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SENTRY_CATALOG = {
  source: 'sentry',
  companyName: 'Sentry',
  officialBrandName: 'Sentry',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'sentry/jobs.json',
  companyCareerPage: 'https://sentry.io/careers',
  companyDomain: 'sentry.io',
  atsPlatform: 'official-first-party-careers-page',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-open-roles-page-current-empty-india-slice',
  extractionStrategy:
    'verified-first-party-open-roles-page+same-domain-role-links+return-empty-when-no-india-locations',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://sentry.io/careers was the live first-party Sentry careers page, that its inline openings list exposed 48 open positions on same-domain UUID-based /careers/{id}/ detail links, and that the visible role locations covered San Francisco, Toronto, Vienna, Sydney, Amsterdam, and New York City with zero India locations.',
}

export default SENTRY_CATALOG
