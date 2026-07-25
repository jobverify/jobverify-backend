import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CYBER_INFRASTRUCTURE_CATALOG = {
  source: 'cyberinfrastructure',
  companyName: 'Cyber Infrastructure',
  officialBrandName: 'Cyber Infrastructure (CIS)',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  companyCareerPage: 'https://career.cisin.com/',
  companyDomain: 'cisin.com',
  atsPlatform: 'first-party-multi-country-jobs-board',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-country-sections',
  extractionStrategy: 'first-party-html-role-cards+country-section-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://career.cisin.com/ is Cyber Infrastructure\'s live first-party jobs board, that it exposes country-specific sections including "Current roles at India", and that the public HTML lists role titles with view-details/apply links that can be scraped directly from the first-party surface.',
}

export default CYBER_INFRASTRUCTURE_CATALOG
