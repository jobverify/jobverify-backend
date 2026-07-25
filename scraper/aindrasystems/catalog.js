import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AINDRA_SYSTEMS_CATALOG = {
  source: 'aindrasystems',
  companyName: 'Aindra Systems',
  adapter: 'script',
  companyCareerPage: 'https://www.aindra.in/',
  applicationEmail: 'contactus@aindra.in',
  applicationUrl: 'mailto:contactus@aindra.in',
  companyDomain: 'aindra.in',
  atsPlatform: 'official-company-site',
  countryFilter: 'India',
  paginationStrategy: 'single-homepage-careers-section',
  extractionStrategy: 'verified-homepage-careers-section+inline-role-modals+mailto-apply',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-14',
  verifiedSurfaceSummary:
    'Verified on July 14, 2026 that https://www.aindra.in/ is the official Aindra Systems homepage, the Careers navigation resolves within that same first-party page, and the Join us at Aindra section publishes public role descriptions that instruct applicants to email contactus@aindra.in.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AINDRA_SYSTEMS_CATALOG
