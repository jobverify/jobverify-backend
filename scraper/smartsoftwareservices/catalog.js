import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SMART_SOFTWARE_SERVICES_CATALOG = {
  source: 'smartsoftwareservices',
  companyName: 'Smart Software Services(I)',
  officialBrandName: 'Smart Software Services',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  homepageUrl: 'https://smartsoftwareservices.com/',
  companyCareerPage: 'https://smartsoftwareservices.com/careers',
  atsPlatform: 'official-company-careers-page-no-public-apply-links',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-page-with-open-role-count-return-empty',
  extractionStrategy: 'verified-first-party-careers-page+role-family-signals-without-trustworthy-public-detail-urls',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'smartsoftwareservices.com',
  dryRunFile: 'smartsoftwareservices/jobs.json',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://smartsoftwareservices.com/careers was the live first-party Smart Software Services careers page, that it advertised 4 open roles, and that the public page exposed role-family signals such as QA, FE, BE, and Design without trustworthy public detail or apply URLs to scrape directly.',
}

export default SMART_SOFTWARE_SERVICES_CATALOG
