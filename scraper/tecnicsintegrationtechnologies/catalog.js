import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TECNICS_INTEGRATION_TECHNOLOGIES_CATALOG = {
  source: 'tecnicsintegrationtechnologies',
  companyName: 'Tecnics Integration Technologies',
  officialBrandName: 'Tecnics',
  adapter: 'script',
  homepageUrl: 'https://tecnics.com/',
  companyCareerPage: 'https://tecnics.com/careers/',
  applyUrl: 'mailto:careers@tecnics.com',
  atsPlatform: 'official-first-party-apac-role-sections',
  countryFilter: 'India',
  paginationStrategy: 'single-page',
  extractionStrategy: 'tabbed-role-sections',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'tecnics.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://tecnics.com/careers/ was the live first-party Tecnics careers page for the backlog company Tecnics Integration Technologies, that the APAC tab publicly exposed Hyderabad roles including Sr. SAP ABAP Developer and Senior DevOps Engineer, and that those APAC roles shared the first-party mailto handoff careers@tecnics.com.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default TECNICS_INTEGRATION_TECHNOLOGIES_CATALOG
