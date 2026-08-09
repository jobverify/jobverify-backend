import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VALTECH_INDIA_SYSTEMS_CATALOG = {
  source: 'valtechindiasystems',
  companyName: 'Valtech India Systems',
  officialBrandName: 'Valtech',
  adapter: 'script',
  homepageUrl: 'https://www.valtech.com/en-in/career/',
  companyCareerPage: 'https://www.valtech.com/en-in/career/',
  sampleJobUrl: 'https://www.valtech.com/en-in/career/jobs/4944510101/',
  atsPlatform: 'first-party-careers-page-plus-greenhouse-apply-handoff',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-plus-detail-pages',
  extractionStrategy: 'verified-careers-page-visible-job-links+first-party-detail-pages+india-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'www.valtech.com',
  verifiedOn: '2026-08-06',
  verifiedSurfaceSummary:
    'Verified on Thursday, August 6, 2026 that the former India-only careers host careers.india.valtech.com no longer resolves, and that the live public source for Valtech India roles is now https://www.valtech.com/en-in/career/. That careers page visibly linked first-party detail routes such as https://www.valtech.com/en-in/career/jobs/4944510101/ for SAP Commerce/Hybris Lead developer in Bengaluru, while each detail page kept the role content on Valtech\'s own domain and used Greenhouse only for the external apply handoff.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default VALTECH_INDIA_SYSTEMS_CATALOG
