import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const BEBO_TECHNOLOGIES_CATALOG = {
  source: 'bebotechnologies',
  companyName: 'bebo Technologies',
  officialBrandName: 'bebo Technologies',
  adapter: 'script',
  homepageUrl: 'https://www.bebotechnologies.com/',
  companyCareerPage: 'https://www.bebotechnologies.com/careers',
  companyDomain: 'bebotechnologies.com',
  officialApplyHost: 'https://bebotechnologiesin.mobile-recruit.com/',
  atsPlatform: 'official-first-party-role-cards',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page',
  extractionStrategy: 'verified-first-party-job-blocks+mobile-recruit-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.bebotechnologies.com/careers remained the live first-party bebo Technologies careers page, publicly listed India openings on the page itself, and linked each opening to official public mobile-recruit apply URLs. The verified surface exposed roles including Associate Software Architect Level 1 Agentic AI, Sr. Software Engineer, and Software Engineer Java+Reactjs on the verified date.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default BEBO_TECHNOLOGIES_CATALOG
