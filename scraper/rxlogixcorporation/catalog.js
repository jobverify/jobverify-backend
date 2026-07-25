import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const RX_LOGIX_CORPORATION_CATALOG = {
  source: 'rxlogixcorporation',
  companyName: 'RxLogix Corporation',
  adapter: 'script',
  companyCareerPage: 'https://rxlogix.com/careers/',
  companyDomain: 'rxlogix.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-page-plus-first-party-detail-pages',
  extractionStrategy: 'verified-first-party-careers-page+india-opening-links+first-party-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://rxlogix.com/careers/ remained the official RxLogix careers page and listed India openings including Technical Architect in Noida, India and Performance Test Engineer in Noida, India as first-party detail links.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default RX_LOGIX_CORPORATION_CATALOG
