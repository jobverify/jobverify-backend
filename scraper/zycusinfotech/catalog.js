import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ZYCUS_INFOTECH_CATALOG = {
  source: 'zycusinfotech',
  companyName: 'Zycus Infotech',
  officialBrandName: 'Zycus',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://www.zycus.com/company/careers',
  companyDomain: 'zycus.com',
  jobsApiUrl: 'https://careers-be.talismatic.com:5010/api/microsite/job-list',
  companyConfigUrl: 'https://careers-be.talismatic.com:5010/api/microsite/get-company-config?slug=zycus',
  atsPlatform: 'talismatic-microsite-api',
  countryFilter: 'India',
  paginationStrategy: 'single-talismatic-job-list-request',
  extractionStrategy: 'verified-first-party-careers-page+talismatic-job-list+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.zycus.com/company/careers is the live first-party Zycus careers page and that its SEARCH ALL JOBS handoff resolves to https://zycus.talismatic.com/jobs. Live verification on the same date confirmed the public Talismatic microsite APIs at get-company-config and job-list returning 71 open Zycus jobs, including India roles such as Director - Technical Account Management (APAC) and OpenShift & Kubernetes Administrator.',
}

export default ZYCUS_INFOTECH_CATALOG
