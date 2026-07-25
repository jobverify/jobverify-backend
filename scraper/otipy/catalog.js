import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const OTIPY_CATALOG = {
  source: 'otipy',
  companyName: 'Otipy',
  officialBrandName: 'Otipy',
  adapter: 'script',
  homepageUrl: 'https://otipy.com/',
  companyCareerPage: 'https://otipy.com/careers',
  companyDomain: 'otipy.com',
  officialJobsPageUrl: 'https://otipy.com/jobs',
  atsPlatform: 'official-company-site-blocked-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'homepage-and-careers-route-blocked-surface-validation',
  extractionStrategy: 'verified-homepage-403+verified-careers-403+verified-jobs-403-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that the official first-party Otipy homepage at https://otipy.com/, the official careers route at https://otipy.com/careers, and the official jobs route at https://otipy.com/jobs all returned the same blocked first-party response: HTTP 403 Forbidden with the body "Access is restricted", so no trustworthy public jobs surface was exposed.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'otipy/jobs.json',
}

export default OTIPY_CATALOG
