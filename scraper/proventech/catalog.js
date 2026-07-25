import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVENTECH_CATALOG = {
  source: 'proventech',
  companyName: 'Proventech',
  officialBrandName: 'ProvenTech',
  adapter: 'script',
  homepageUrl: 'https://new.proventech.in/index?temp=index',
  companyCareerPage: 'https://new.proventech.in/index?temp=career',
  applyUrl: 'https://new.proventech.in/index?temp=career',
  atsPlatform: 'official-first-party-role-cards',
  countryFilter: 'India',
  paginationStrategy: 'single-page',
  extractionStrategy: 'same-page-role-cards',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'proventech.in',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://new.proventech.in/index?temp=career was the live first-party ProvenTech careers page for the backlog company Proventech and that it publicly exposed same-page role cards including SAP UI5/Fiori Consultant, SAP ABAP Developer, and Documentum D2 Administrator in Hyderabad using the shared first-party application form on the same route.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default PROVENTECH_CATALOG
