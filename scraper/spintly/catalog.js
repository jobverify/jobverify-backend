import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SPINTLY_CATALOG = {
  source: 'spintly',
  companyName: 'Spintly',
  officialBrandName: 'Spintly',
  adapter: 'script',
  homepageUrl: 'https://spintly.com/',
  companyCareerPage: 'https://spintly.com/careers/',
  companyDomain: 'spintly.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-text-sections',
  extractionStrategy: 'verified-first-party-careers-page+inline-job-sections+shared-apply-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on July 17, 2026 that https://spintly.com/careers/ is the live first-party Spintly careers page, that it invites applicants to "Join Us As We Build The Future of Access Control", and that it publishes public inline Job Openings sections directly on that page with a shared first-party application form.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default SPINTLY_CATALOG
