import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const RAILWAY_CATALOG = {
  source: 'railway',
  companyName: 'Railway',
  officialBrandName: 'Railway',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'railway/jobs.json',
  companyCareerPage: 'https://railway.com/careers?mdrv=railway.com',
  companyDomain: 'railway.com',
  atsPlatform: 'official-first-party-careers-page',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-current-global-remote-slice',
  extractionStrategy: 'verified-first-party-careers-page+same-domain-role-links+return-empty-when-no-india-locations',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://railway.com/careers?mdrv=railway.com was the live first-party Railway careers page, that it prominently stated "Redefine the future of infrastructure", and that it publicly exposed same-domain role pages including Senior DevRel Engineer - Product, Senior DevRel Engineer - Growth, and Senior Full-Stack Engineer - Product with remote-only location labels and zero India locations on the verified date.',
}

export default RAILWAY_CATALOG
