import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ADDA247_CATALOG = {
  source: 'adda247',
  companyName: 'Adda247',
  adapter: 'script',
  companyCareerPage: 'https://www.adda247.com/careers.html',
  companyDomain: 'adda247.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  atsPlatform: 'keka',
  paginationStrategy: 'single-first-party-careers-page-plus-keka-active-jobs-api',
  extractionStrategy: 'verified-first-party-careers-shell+official-keka-active-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-19',
  verifiedSurfaceSummary:
    'Verified on July 19, 2026 that https://www.adda247.com/careers.html is the current first-party Adda247 careers shell. It links Join Us to docs.google.com and View all openings to https://adda247.kekahire.com/, which redirects to https://adda247.keka.com/careers/ and exposes active public India jobs through the Keka careers API.',
  externalHandoffUrl: 'https://adda247.kekahire.com/',
  kekaCareersUrl: 'https://adda247.keka.com/careers/',
  kekaActiveJobsApiUrl: 'https://adda247.keka.com/careers/api/jobs/default/active',
  modulePath: path.join(currentDir, 'script.js'),
}

export default ADDA247_CATALOG
