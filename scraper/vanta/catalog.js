import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VANTA_CATALOG = {
  source: 'vanta',
  companyName: 'Vanta',
  officialBrandName: 'Vanta',
  adapter: 'script',
  companyCareerPage: 'https://www.vanta.com/company/careers',
  companyDomain: 'vanta.com',
  atsPlatform: 'official-first-party-webflow-careers',
  countryFilter: 'India',
  paginationStrategy: 'first-party-webflow-pagination',
  extractionStrategy: 'verified-first-party-careers-pages+browser-rendered-role-cards+india-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://www.vanta.com/company/careers was the live first-party Vanta careers page, that the same first-party pagination surface advanced to https://www.vanta.com/company/careers?9a22bd08_page=2 for additional open roles, and that page 3 fell through to the first-party "No open position found" empty state. Verified visible public roles included Senior Software Engineer, Developer Experience on page 1 and Senior Fullstack Engineer, Vendor Risk Management on page 2, with zero India-visible openings on the verified date.',
  dryRunFile: 'vanta/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default VANTA_CATALOG
