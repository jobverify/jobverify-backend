import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Reviewed October 23, 2026: https://www.policybazaar.com/careers/ displays 4 inline role cards: Associate Sales Consultant, Associate Service Consultant, Relationship Manager, and Careers in Technology, plus a position-select resume upload form. The 7 general hiring-city office entries do not bind locations or an explicit country to individual roles, and the generic technology/resume pool does not establish a finite vacancy inventory. Runtime checks retain native observations and report an explicit coverage gap; they never infer four verified vacancies or a verified empty inventory.'

export const POLICYBAZAAR_CATALOG = {
  source: 'policybazaar',
  companyName: 'Policybazaar',
  officialBrandName: 'Policybazaar',
  adapter: 'script',
  homepageUrl: 'https://www.policybazaar.com/',
  companyCareerPage: 'https://www.policybazaar.com/careers/',
  publicBoardUrl: 'https://www.policybazaar.com/careers/',
  companyDomain: 'policybazaar.com',
  verifiedHiringCities: [
    'Gurugram',
    'Mumbai',
    'Pune',
    'Kolkata',
    'Chennai',
    'Bangalore',
    'Hyderabad',
  ],
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-inline-careers-page',
  extractionStrategy:
    'first-party-inline-role-observations+explicit-role-location-and-vacancy-coverage-gap',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-10-23',
  verifiedPublicOpeningCount: null,
  observedRoleCardCount: 4,
  currentInventoryStatus: 'coverage-gap',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'policybazaar/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default POLICYBAZAAR_CATALOG
