import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CIVICA_INDIA_CATALOG = {
  source: 'civicaindia',
  companyName: 'Civica India',
  officialBrandName: 'Civica',
  adapter: 'script',
  companyCareerPage: 'https://www.civica.com/en-in/about-us/careers/',
  workablePageUrl: 'https://apply.workable.com/civica/',
  workableLlmsUrl: 'https://apply.workable.com/civica/llms.txt',
  companyDomain: 'civica.com',
  atsPlatform: 'first-party-careers-page-plus-workable-zero-openings-feed',
  countryFilter: 'India',
  paginationStrategy: 'civica-careers-page-plus-workable-llms-zero-openings-check',
  extractionStrategy: 'verified-civica-india-careers-page+verified-workable-llms-zero-openings+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.civica.com/en-in/about-us/careers/ remained the exact first-party Civica India careers page and linked Our vacancies to https://apply.workable.com/civica/. The public llms feed at https://apply.workable.com/civica/llms.txt reported 0 current openings on that exact board, while separate indexed job pages under the different civica-uk-ltd-1 tenant still existed in search results. Because the exact first-party handoff reported zero current openings and the alternate tenant pages were not a trustworthy exact-surface feed, this provider remains fail-closed.',
  dryRunFile: 'civicaindia/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default CIVICA_INDIA_CATALOG
