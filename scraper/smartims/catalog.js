import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SMART_IMS_CATALOG = {
  source: 'smartims',
  companyName: 'Smart IMS',
  officialBrandName: 'Smart IMS',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  companyCareerPage: 'https://www.smartims.com/careers/',
  companyDomain: 'smartims.com',
  atsPlatform: 'first-party-careers-page-with-current-openings',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-current-openings-section',
  extractionStrategy:
    'first-party-html-region-links+current-job-openings-block-extraction+apply-email-detection',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.smartims.com/careers/ is Smart IMS\'s live first-party careers page, that it exposes region selectors including Smart IMS India, and that the public HTML currently publishes parseable Current Job Openings blocks with role titles, experience, locations, and apply-by-email instructions.',
}

export default SMART_IMS_CATALOG
