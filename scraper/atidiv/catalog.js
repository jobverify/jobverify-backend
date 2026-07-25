import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ATIDIV_CATALOG = {
  source: 'atidiv',
  companyName: 'Atidiv',
  officialBrandName: 'Atidiv',
  adapter: 'script',
  homepageUrl: 'https://www.atidiv.com/',
  companyCareerPage: 'https://www.atidiv.com/careers/',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-static-careers-page',
  extractionStrategy: 'verified-first-party-careers-page+static-current-openings-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'atidiv.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.atidiv.com/careers/ remained the exact first-party Atidiv careers page and exposed a server-rendered Current Openings section linking to the first-party detail page for Senior Campaign Manager with Digital Marketing, Full-Time, Growth, and Remote tags.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default ATIDIV_CATALOG
