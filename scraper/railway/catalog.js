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
  companyCareerPage: 'https://railway.com/careers',
  companyDomain: 'railway.com',
  atsPlatform: 'official-first-party-careers-page',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-current-global-remote-slice',
  extractionStrategy: 'verified-first-party-careers-page+same-domain-role-links+return-empty-when-no-india-locations',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-21',
  verifiedSurfaceSummary:
    'Verified on Friday, August 21, 2026 that https://railway.com/careers remained the live first-party Railway careers page, that it prominently stated "Redefine the future of infrastructure", and that it publicly exposed same-domain role pages including Senior Infra Engineer: Platform, Senior Infra Engineer: Storage, Senior Infra Engineer: Observability, and Senior Infra Engineer: Datacenters with "Remote (anywhere)" location labels and zero India locations on the verified date.',
}

export default RAILWAY_CATALOG
