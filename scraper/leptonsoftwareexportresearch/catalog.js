import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const LEPTON_SOFTWARE_EXPORT_RESEARCH_CATALOG = {
  source: 'leptonsoftwareexportresearch',
  companyName: 'Lepton Software Export & Research',
  officialBrandName: 'Lepton Software',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://leptonsoftware.com/career/',
  companyDomain: 'leptonsoftware.com',
  jobsApiUrl: 'https://leptonsoftware.keka.com/careers/api/jobs/default/active',
  atsPlatform: 'keka-public-jobs-api',
  countryFilter: 'India',
  paginationStrategy: 'single-keka-public-jobs-request',
  extractionStrategy: 'verified-first-party-careers-page+public-keka-jobs-api+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    "Verified on Saturday, July 18, 2026 that https://leptonsoftware.com/career/ is the live first-party Lepton careers page and that it requests the public Keka jobs endpoint https://leptonsoftware.keka.com/careers/api/jobs/default/active. Live verification on the same date confirmed that endpoint returning public openings including Executive Assistant - Founder's Office and Account Executive - New Business in Gurgaon, India.",
}

export default LEPTON_SOFTWARE_EXPORT_RESEARCH_CATALOG
