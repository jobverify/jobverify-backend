import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY = "Verified on Wednesday, August 5, 2026 that the official Stellapps jobs archive at https://www.stellapps.com/jobopenings/ still exposed live first-party opening pages including https://www.stellapps.com/jobopenings/service-engineer/ and https://www.stellapps.com/jobopenings/program-manager/ on the stellapps.com domain, but the archive also emitted a non-job 'LOG IN' link at https://www.stellapps.com/jobopenings/0# that must be ignored. The live detail pages still rendered public title, employment type, experience, location, and job content inside the jobDescriptionSection block without requiring any separate jobs API."

export const STELLAPPS_CATALOG = {
  source: 'stellapps',
  companyName: 'Stellapps',
  officialBrandName: 'Stellapps',
  adapter: 'script',
  companyCareerPage: 'https://www.stellapps.com/jobopenings/',
  officialCareersPageUrl: 'https://www.stellapps.com/career/',
  jobOpeningsArchiveUrl: 'https://www.stellapps.com/jobopenings/',
  companyDomain: 'stellapps.com',
  atsPlatform: 'official-company-site-public-job-pages',
  countryFilter: 'India',
  paginationStrategy: 'single-verified-job-openings-archive-page',
  extractionStrategy: 'verified-job-openings-archive+first-party-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-05',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'stellapps/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default STELLAPPS_CATALOG
