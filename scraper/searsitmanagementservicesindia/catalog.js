import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SEARS_IT_MANAGEMENT_SERVICES_INDIA_CATALOG = {
  source: 'searsitmanagementservicesindia',
  companyName: 'Sears IT & Management Services India',
  officialBrandName: 'Sears Holdings India',
  adapter: 'script',
  homepageUrl: 'https://searsholdingsindia.in/',
  companyCareerPage: 'https://searsholdingsindia.in/careers/',
  companyDomain: 'searsholdingsindia.in',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-public-careers-shell',
  extractionStrategy: 'verified-careers-shell+location-tabs-without-public-role-records-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://searsholdingsindia.in/careers/ is the live first-party Sears Holdings India careers page for the backlog row Sears IT & Management Services India. The page exposes city tabs such as Pune, Hyderabad, and Chennai plus application-copy and contact text, but the first-party HTML does not provide trustworthy structured job titles or detail links that can be scraped exactly. This local provider fails closed until Sears exposes a public role list.',
  dryRunFile: 'searsitmanagementservicesindia/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SEARS_IT_MANAGEMENT_SERVICES_INDIA_CATALOG
