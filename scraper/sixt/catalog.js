import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SIXT_CATALOG = {
  source: 'sixt',
  companyName: 'Sixt',
  officialBrandName: 'SIXT',
  adapter: 'script',
  homepageUrl: 'https://www.sixt.jobs/in/about-us',
  companyCareerPage: 'https://www.sixt.jobs/in/jobs?q=&country=IN',
  officialCareersPageUrl: 'https://www.sixt.jobs/in/jobs?q=&country=IN',
  detailPagePrefix: 'https://www.sixt.jobs/in/jobs/',
  companyDomain: 'sixt.jobs',
  atsPlatform: 'first-party-careers-site',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-india-listing-page+first-party-detail-pages',
  extractionStrategy: 'verified-first-party-india-jobs-page+visible-job-links+first-party-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 against https://www.sixt.jobs/in/about-us and https://www.sixt.jobs/in/jobs?q=&country=IN. The first-party SIXT India jobs page exposed 4 public India roles through first-party detail pages, including Senior Product Manager II (Salesforce), Engineering Manager (Salesforce), AI Data Engineer III, and Staff Data Engineer.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default SIXT_CATALOG
