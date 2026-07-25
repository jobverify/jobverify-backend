import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MOBILOITTE_TECHNOLOGIES_CATALOG = {
  source: 'mobiloittetechnologies',
  companyName: 'Mobiloitte Technologies',
  officialBrandName: 'Mobiloitte',
  adapter: 'script',
  homepageUrl: 'https://www.mobiloitte.com/',
  companyCareerPage: 'https://www.mobiloitte.com/careers',
  companyDomain: 'mobiloitte.com',
  atsPlatform: 'first-party-careers-page-empty-search-state',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-empty-filter-state',
  extractionStrategy:
    'verified-first-party-careers-page+no-jobs-found-state+resume-drop-fallback',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.mobiloitte.com/careers is the exact-name Mobiloitte careers page, that it renders the branded "Current Openings" search/filter UI, and that the visible public state currently says "No Jobs Found" while offering a "Send Your Resume" fallback to careers@mobiloitte.com. Because no trustworthy public role inventory is presently exposed, this local provider remains empty-state only.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'mobiloittetechnologies/jobs.json',
}

export default MOBILOITTE_TECHNOLOGIES_CATALOG
