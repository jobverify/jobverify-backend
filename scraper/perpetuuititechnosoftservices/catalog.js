import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PERPETUUITI_TECHNOSOFT_SERVICES_CATALOG = {
  source: 'perpetuuititechnosoftservices',
  companyName: 'Perpetuuiti Technosoft Services',
  officialBrandName: 'Perpetuuiti',
  adapter: 'script',
  homepageUrl: 'https://perpetuuiti.com/',
  companyCareerPage: 'https://perpetuuiti.com/Careers.php',
  applicationFormUrl: 'https://perpetuuiti.com/Careers-Form.php',
  atsPlatform: 'first-party-careers-page-broken-application-form',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-plus-broken-form-handoff',
  extractionStrategy:
    'verified-careers-page+generic-open-positions-cta+broken-careers-form-handoff+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'perpetuuiti.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://perpetuuiti.com/Careers.php was the live first-party Perpetuuiti careers page, that it marketed "great people" and "open positions" but only handed applicants to Careers-Form.php, and that the first-party handoff page at https://perpetuuiti.com/Careers-Form.php returned HTTP 500 Internal Server Error instead of an enumerable public jobs surface. This provider therefore stays fail-closed.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default PERPETUUITI_TECHNOSOFT_SERVICES_CATALOG
