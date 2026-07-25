import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CODEWAVE_TECHNOLOGIES_CATALOG = {
  source: 'codewavetechnologies',
  companyName: 'Codewave Technologies',
  officialBrandName: 'Codewave',
  adapter: 'script',
  companyCareerPage: 'https://codewave.com/careers/',
  companyDomain: 'codewave.com',
  atsPlatform: 'first-party-html-job-pages',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-listing-page-plus-detail-pages',
  extractionStrategy: 'verified-first-party-careers-page+detail-page-validation+mailto-apply-handoff',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://codewave.com/careers/ was the live first-party Codewave careers page and that it publicly listed Open Positions including Infra Builder: Senior DevOps & Cloud, Infra Builder: DevOps & Cloud, and AI Builder: Models & Agents in Bangalore. Verified the linked first-party role pages exposed Full-time Bangalore detail blocks and Apply for this job mailto handoffs to jobs@codewave.com.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'codewavetechnologies/jobs.json',
}

export default CODEWAVE_TECHNOLOGIES_CATALOG
