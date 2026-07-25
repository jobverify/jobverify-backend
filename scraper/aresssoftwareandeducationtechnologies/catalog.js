import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ARESS_SOFTWARE_AND_EDUCATION_TECHNOLOGIES_CATALOG = {
  source: 'aresssoftwareandeducationtechnologies',
  companyName: 'Aress Software and Education Technologies',
  officialBrandName: 'Aress Software',
  adapter: 'script',
  companyCareerPage: 'https://www.aress.com/careers/',
  companyDomain: 'aress.com',
  atsPlatform: 'official-first-party-job-cards',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page',
  extractionStrategy: 'verified-first-party-careers-page+division-job-cards+same-page-details-handoff',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.aress.com/careers/ was the live first-party Aress Software careers page and that it publicly exposed a Current Openings section with division-specific availability. The verified first-party page listed a Business Development opening for Digital Marketing Executive with Location: Nashik, Experience: 1-3 Years, and Jobcode: Digital Marketing Executive - Hiring 2026, while several other divisions displayed No jobs available.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default ARESS_SOFTWARE_AND_EDUCATION_TECHNOLOGIES_CATALOG
