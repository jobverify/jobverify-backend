import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ACUVATE_SOFTWARE_CATALOG = {
  source: 'acuvatesoftware',
  companyName: 'Acuvate Software',
  officialBrandName: 'Acuvate',
  adapter: 'script',
  homepageUrl: 'https://acuvate.com/',
  companyCareerPage: 'https://acuvate.com/careers/',
  applyUrl: 'https://acuvate.com/careers/#fill_the_form',
  atsPlatform: 'official-first-party-role-sections',
  countryFilter: 'India',
  paginationStrategy: 'single-page',
  extractionStrategy: 'same-page-role-sections',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'acuvate.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://acuvate.com/careers/ was the live first-party Acuvate careers page for the backlog company Acuvate Software, that it publicly exposed same-page role sections including Project Manager, CUX Designer, and Agentic AI Architect in Hyderabad, and that each role used the shared first-party Apply Now handoff at https://acuvate.com/careers/#fill_the_form.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default ACUVATE_SOFTWARE_CATALOG
