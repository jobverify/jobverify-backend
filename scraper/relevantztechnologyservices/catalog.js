import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const RELEVANTZ_TECHNOLOGY_SERVICES_CATALOG = {
  source: 'relevantztechnologyservices',
  companyName: 'Relevantz Technology Services',
  officialBrandName: 'Relevantz',
  adapter: 'script',
  homepageUrl: 'https://relevantz.com/',
  companyCareerPage: 'https://relevantz.com/careers/',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page',
  extractionStrategy: 'verified-first-party-careers-page+india-section-inline-openings',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'relevantz.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://relevantz.com/careers/ is the exact Relevantz careers page, that it exposes a Careers India section with inline openings, and that the current India roles include Java Full stack Developer, Data Architect, ServiceNow Developer, Angular Full Stack Developer, Data Engineer (ETL), and Business Analyst.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default RELEVANTZ_TECHNOLOGY_SERVICES_CATALOG
