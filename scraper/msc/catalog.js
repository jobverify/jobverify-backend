import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Monday, August 3, 2026 that the official MSC careers page https://www.msc.com/en/careers renders the first-party "Work With Us - Careers & Vacancies | MSC" shell with the public career APIs /api/feature/Career/GetJobLocationsList and /api/feature/Career/GetJobVacanciesJobLocationId. The India location is listed in the job-locations API, and the India vacancies API currently returns the official empty-state message "Unfortunately, we do not have any vacancies published in this country right now" with Jobs: []. This provider now validates the careers shell, resolves the India location from the API, and returns an empty array unless the India vacancies payload starts returning inline jobs.'

export const MSC_CATALOG = {
  source: 'msc',
  companyName: 'MSC',
  officialBrandName: 'MSC Mediterranean Shipping Company',
  adapter: 'script',
  homepageUrl: 'https://www.msc.com/en',
  companyCareerPage: 'https://www.msc.com/en/careers',
  companyDomain: 'msc.com',
  atsPlatform: 'official-company-careers-api',
  countryFilter: 'India',
  paginationStrategy: 'single-location-api-request',
  extractionStrategy: 'verified-careers-shell+job-locations-api+location-vacancies-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'msc/jobs.json',
  verifiedOn: '2026-08-03',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default MSC_CATALOG
