import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const GOKHANA_CATALOG = {
  source: 'gokhana',
  companyName: 'GoKhana',
  companyCareerPage: 'https://gokhana.com/careers/',
  companyDomain: 'gokhana.com',
  adapter: 'script',
  atsPlatform: 'official-company-careers-linkout',
  countryFilter: 'India',
  paginationStrategy: 'single-page-job-card-scan',
  extractionStrategy: 'official-careers-page+elementor-job-card-extraction+linkedin-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  modulePath: path.join(currentDir, 'script.js'),
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://gokhana.com/careers/ is the current official GoKhana careers page and publicly lists 10 open positions on the first-party page with location, employment type, and LinkedIn apply links.',
  openingCount: 10,
  applyDomain: 'linkedin.com',
}

export default GOKHANA_CATALOG
