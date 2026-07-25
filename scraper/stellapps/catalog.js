import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY = 'Verified on Friday, July 17, 2026 that the official Stellapps careers landing page at https://www.stellapps.com/career/ linked to the live first-party job openings archive at https://www.stellapps.com/jobopenings/, and that the archive exposed public Stellapps detail pages including https://www.stellapps.com/jobopenings/service-engineer/ and https://www.stellapps.com/jobopenings/program-manager/ with role-specific title, location, experience, and job content on the first-party stellapps.com domain. No separate public jobs API was required because the verified first-party archive and detail pages rendered the current openings directly.'

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
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'stellapps/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default STELLAPPS_CATALOG
