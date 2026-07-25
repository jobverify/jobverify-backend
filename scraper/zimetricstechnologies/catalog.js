import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ZIMETRICS_TECHNOLOGIES_CATALOG = {
  source: 'zimetricstechnologies',
  companyName: 'Zimetrics Technologies',
  officialBrandName: 'Zimetrics',
  adapter: 'script',
  companyCareerPage: 'https://zimetrics.com/career/',
  atsPlatform: 'official-company-careers-form-handoff',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-page-inline-role-cards',
  extractionStrategy:
    'verified-first-party-careers-page+inline-role-cards+form-anchor-apply-handoff+dedupe-identical-cards',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'zimetrics.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://zimetrics.com/career/ remained the live first-party Zimetrics careers page, that the page exposed a visible "We are Hiring!" section with repeated inline role cards for Full Stack Engineer (Node & React) | Immediate Joiner in Pune, and that each public Apply Now button jumped to the first-party #frmsub application anchor on the same page. The local scraper therefore dedupes identical cards and emits the unique visible India role.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'zimetricstechnologies/jobs.json',
}

export default ZIMETRICS_TECHNOLOGIES_CATALOG
