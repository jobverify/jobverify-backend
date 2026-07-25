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
  officialCareersHandoffUrl: 'https://recruitcareers.zappyhire.com/en/dhan',
  careersApiOrigin: 'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com',
  careersConfigUrl: 'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/careers/configurations/',
  careersFilterParamsUrl: 'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/careers/filter-params/',
  jobsApiUrl: 'https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/jobs/jobsearch/?page=1&page_size=12',
  companyDomain: 'dhan.co',
  atsPlatform: 'zappyhire',
  countryFilter: 'India',
  paginationStrategy: 'zappyhire-jobsearch-page-parameter',
  extractionStrategy:
    'verified-first-party-careers-page+zappyhire-board-shell+zappyhire-config-api+zappyhire-jobsearch-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://dhan.co/ is the live first-party Dhan homepage and its Careers navigation links to https://dhan.co/career/, whose first-party copy includes the trusted public jobs handoff at https://recruitcareers.zappyhire.com/en/dhan. The corresponding Dhan Zappyhire tenant endpoints at https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/careers/configurations/, https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/careers/filter-params/, and https://dhan.zappyhire-multitenant-be-prod.zappyhire.com/api/jobs/jobsearch/?page=1&page_size=12 returned Dhan-specific branding with Raise Careers, Mumbai and Design filter data, and one live public role titled Product & Growth Marketing - fuzz (Raise AI) during verification.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default DHAN_CATALOG
