import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, July 16, 2026 that https://www.policybazaar.com/careers/ is the live first-party Policybazaar careers page, that it exposes 4 inline public role cards for Associate Sales Consultant, Associate Service Consultant, Relationship Manager, and Careers in Technology, and that the same first-party page contains the position-select resume upload form used to apply for those roles. The verified careers page also publishes current hiring-city information for Gurugram, Mumbai, Pune, Kolkata, Chennai, Bangalore, and Hyderabad. The official surface does not expose distinct public per-role URLs or a separate ATS handoff, so the provider returns page-anchored listings from the verified first-party careers page only.'

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
    'verified-first-party-inline-job-cards+shared-first-party-position-select-application-form+page-anchored-listings-only',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedPublicOpeningCount: 4,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'policybazaar/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default POLICYBAZAAR_CATALOG
