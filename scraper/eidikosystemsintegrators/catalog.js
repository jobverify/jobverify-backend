import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const EIDIKO_SYSTEMS_INTEGRATORS_CATALOG = {
  source: 'eidikosystemsintegrators',
  companyName: 'Eidiko Systems Integrators',
  officialBrandName: 'Eidiko',
  adapter: 'script',
  homepageUrl: 'https://eidiko.com/',
  companyCareerPage: 'https://eidiko.com/',
  companyDomain: 'eidiko.com',
  candidateRouteUrls: [
    'https://eidiko.com/',
    'https://eidiko.com/careers',
    'https://eidiko.com/careers/',
    'https://eidiko.com/jobs',
    'https://eidiko.com/job-openings',
  ],
  atsPlatform: 'official-site-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-careers-route-validation',
  extractionStrategy: 'verified-homepage+404-careers-routes+no-trustworthy-public-jobs-surface-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://eidiko.com/ is the live official Eidiko homepage, while adjacent first-party routes including /careers, /careers/, /jobs, and /job-openings returned 404 responses and no trustworthy public jobs surface was available.',
  dryRunFile: 'eidikosystemsintegrators/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default EIDIKO_SYSTEMS_INTEGRATORS_CATALOG
