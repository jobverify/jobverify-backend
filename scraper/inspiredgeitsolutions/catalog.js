import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INSPIREDGE_IT_SOLUTIONS_CATALOG = {
  source: 'inspiredgeitsolutions',
  companyName: 'Inspiredge IT Solutions',
  officialBrandName: 'Inspiredge',
  adapter: 'script',
  homepageUrl: 'https://inspiredgeit.com/',
  companyCareerPage: 'https://inspiredgeit.com/jobs/',
  atsPlatform: 'official-first-party-jobs-archive',
  countryFilter: 'India',
  paginationStrategy: 'single-archive-page',
  extractionStrategy: 'first-party-job-cards',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'inspiredgeit.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://inspiredgeit.com/jobs/ is the live first-party Inspiredge jobs archive and that it publicly exposes job cards including Telecom Analyst, Python Developer, and Cisco IPT - T2 with on-page Apply Now links and India-relevant locations such as Remote and Hyderabad.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default INSPIREDGE_IT_SOLUTIONS_CATALOG
