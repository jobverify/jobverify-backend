import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SMARTQ_BOTTLE_LAB_TECHNOLOGIES_CATALOG = {
  source: 'smartqbottlelabtechnologies',
  companyName: 'SmartQ - Bottle Lab Technologies',
  officialBrandName: 'SmartQ',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  homepageUrl: 'https://www.thesmartq.com/',
  companyCareerPage: 'https://www.thesmartq.com/careers',
  jobsBoardUrl: 'https://careers.thesmartq.com',
  atsPlatform: 'official-careers-page-handoff-with-unverified-public-board',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-landing-page',
  extractionStrategy: 'verified-careers-shell-plus-handoff-without-board-contract-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'thesmartq.com',
  dryRunFile: 'smartqbottlelabtechnologies/jobs.json',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.thesmartq.com/careers was the live first-party SmartQ careers shell. The page said Great food experiences start with great people, identified Bottle Lab Technologies Pvt Ltd, and handed applicants to https://careers.thesmartq.com via Explore Opportunities, but this sweep did not capture a stable public board contract beyond that handoff.',
}

export default SMARTQ_BOTTLE_LAB_TECHNOLOGIES_CATALOG
