import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const UNILOG_CONTENT_SOLUTIONS_CATALOG = {
  source: 'unilogcontentsolutions',
  companyName: 'Unilog Content Solutions ( P)',
  officialBrandName: 'Unilog',
  adapter: 'script',
  companyCareerPage: 'https://www.unilogcorp.com/careers/',
  officialCareersPageUrl: 'https://www.unilogcorp.com/careers/',
  companyDomain: 'unilogcorp.com',
  atsPlatform: 'first-party-html-open-roles',
  countryFilter: 'India',
  paginationStrategy: 'single-public-page',
  extractionStrategy: 'verified-first-party-careers-page+html-role-cards',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.unilogcorp.com/careers/ was the live first-party Unilog careers page and that it exposed an Open Roles section with public HTML role cards including Java Software Developer (CX1 Platform) and Software Test Engineer – AccelQ & Selenium/Python (Ecomm Domain).',
  dryRunFile: 'unilogcontentsolutions/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default UNILOG_CONTENT_SOLUTIONS_CATALOG
