import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INFRABEAT_TECHNOLOGIES_CATALOG = {
  source: 'infrabeattechnologies',
  companyName: 'Infrabeat Technologies',
  officialBrandName: 'InfraBeat Technologies Pvt. Ltd.',
  adapter: 'script',
  homepageUrl: 'https://infrabeat.com/',
  companyCareerPage: 'https://infrabeat.com/career/',
  companyDomain: 'infrabeat.com',
  atsPlatform: 'official-wordpress-careers-archive',
  countryFilter: 'India',
  paginationStrategy: 'single-wordpress-careers-archive',
  extractionStrategy: 'verified-first-party-careers-archive+career-post-cards+detail-page-urls',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://infrabeat.com/career/ remained the first-party public careers archive headed by "Archives: Careers" for InfraBeat Technologies Pvt. Ltd., exposed four public career posts without pagination, and listed Lead SAP MM Consultant, Lead SAP FICO Consultant, Lead SAP EWM Consultant, and SAP FICO Senior Consultant from Pune.',
  dryRunFile: 'infrabeattechnologies/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default INFRABEAT_TECHNOLOGIES_CATALOG
