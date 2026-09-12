import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const DHAN_CATALOG = {
  source: 'dhan',
  companyName: 'Dhan',
  officialBrandName: 'Dhan',
  adapter: 'script',
  homepageUrl: 'https://dhan.co/',
  companyCareerPage: 'https://dhan.co/career/',
  officialCareersHandoffUrl: 'https://dhan.keka.com/careers/',
  careersApiOrigin: 'https://dhan.keka.com/careers/api',
  careersConfigUrl: null,
  careersFilterParamsUrl: null,
  jobsApiUrl: 'https://dhan.keka.com/careers/api/embedjobs/default/active/7669ff3a-2b35-4442-9bac-9f9ae4b718b3',
  companyDomain: 'dhan.co',
  atsPlatform: 'keka',
  countryFilter: 'India',
  paginationStrategy: 'keka-active-jobs-feed',
  extractionStrategy:
    'verified-first-party-careers-page+keka-careers-handoff+keka-active-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-09-03',
  verifiedSurfaceSummary:
    'Verified on September 3, 2026 that https://dhan.co/career/ is the live first-party Dhan careers page and hands off to https://dhan.keka.com/careers/. The Keka active-jobs endpoint is publicly available, is linked by the career portal tenant document, and returns live Raise/Dhan roles with India locations and Keka job-detail application URLs.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default DHAN_CATALOG
