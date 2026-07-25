import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INTECH_CREATIVE_SERVICES_CATALOG = {
  source: 'intechcreativeservices',
  companyName: 'Intech Creative Services',
  officialBrandName: 'The INTECH Group',
  adapter: 'script',
  homepageUrl: 'https://theintechgroup.com/',
  companyCareerPage: 'https://theintechgroup.com/career/',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-loop-grid-careers-page',
  extractionStrategy: 'verified-first-party-careers-page+elementor-loop-grid-job-cards',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'theintechgroup.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://theintechgroup.com/career/ is the live first-party careers page for The INTECH Group, that it explicitly says "At INTECH Creative Services", and that it exposes Elementor loop-grid job cards for roles including Assistant Consultant - Oracle Fusion, Senior Executive - Implementation, and Personal Assistant with first-party apply links under /career/jobs/.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default INTECH_CREATIVE_SERVICES_CATALOG
